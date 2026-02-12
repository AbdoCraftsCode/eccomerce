import mongoose from "mongoose";
import { CartModel } from "../../../DB/models/cart.model.js";
import { OrderModelUser } from "../../../DB/models/orderSchemaUser.model.js";
import { SubOrderModel } from "../../../DB/models/subOrdersSchema.model.js";
import {
  getCartWithDetails,
  validateCart,
} from "../../cart/services/cart.service.js";
import {
  validateUser,
  validateShippingAddress,
  validatePaymentMethod,
} from "../helpers/user.helpers.js";
import {
  validateAndFetchProducts,
  createProductsMap,
  fetchAndValidateVariants,
} from "../helpers/product.helpers.js";
import { processCartItems } from "../helpers/order-items.helpers.js";
import {
  validateAndApplyCoupon,
  incrementCouponUsage,
  decrementCouponUsage,
} from "../helpers/coupon.helpers.js";
import {
  calculateOrderTotals,
  createOrderItems,
  createOrder,
  buildCouponUsedObject,
} from "../helpers/order.helpers.js";
import {
  reserveAllItemsStock,
  confirmStockReservation,
  releaseMultipleStocks,
} from "../helpers/stock.helpers.js";
import {
  registerActiveSession,
  unregisterActiveSession,
} from "./cleanup.service.js";
import { getOrderMessage } from "../helpers/responseMessages.js";

const transformOrderResponse = (order, lang = "en") => {
  if (!order) return order;

  const localize = (obj) => {
    if (!obj) return "";
    if (typeof obj === "string") return obj;
    return obj[lang] || obj.en || "";
  };

  const transformItem = (item) => {
    const transformed = { ...item };

    if (transformed.product) {
      transformed.product = {
        ...transformed.product,
        name: localize(transformed.product.name),
        description: localize(transformed.product.description),
      };
    }

    if (transformed.variant && transformed.variant.attributes) {
      transformed.variant = {
        ...transformed.variant,
        attributes: transformed.variant.attributes.map((attr) => ({
          ...attr,
          attributeName: localize(attr.attributeName),
          valueName: localize(attr.valueName),
        })),
      };
    }

    return transformed;
  };

  return {
    ...order,
    items: (order.items || []).map(transformItem),
  };
};

export const createOrderforUser = async (
  customerId,
  shippingAddressId,
  paymentMethod,
  couponCode = null,
  lang = "en"
) => {
  let session;
  let reservedItems = [];

  try {
    session = await mongoose.startSession();
    session.startTransaction();

    const user = await validateUser(customerId);
    const shippingAddress = validateShippingAddress(user, shippingAddressId);
    validatePaymentMethod(paymentMethod);

    // Get customer currency details
    const customerCurrencyCode = user.currency?.code || "USD";
    const customerCurrency = user.currency
      ? {
          code: user.currency.code || "USD",
          name: {
            ar: user.currency.name?.ar || "",
            en: user.currency.name?.en || "",
          },
          symbol: user.currency.symbol || "",
        }
      : { code: "USD", name: { ar: "", en: "" }, symbol: "$" };

    const cart = await getCartWithDetails(customerId);
    validateCart(cart);

    // Step 3: Fetch and validate products with session (transactional read)
    const products = await validateAndFetchProducts(cart.items, session);
    const productsMap = createProductsMap(products);

    // Step 4: Fetch and validate variants with session
    const variantsMap = await fetchAndValidateVariants(cart.items, session);

    // Attach variants to cart items
    cart.items = cart.items.map((item) => ({
      ...item,
      variant: item.variant
        ? variantsMap[item.variant._id?.toString() || item.variant.toString()]
        : null,
    }));

    // Step 5: Process items — build embedded objects + convert prices
    const { formattedItems, subtotal } = await processCartItems(
      cart,
      productsMap,
      customerCurrencyCode
    );

    // Step 6: Reserve stock
    await reserveAllItemsStock(formattedItems, session);
    reservedItems = formattedItems;

    // Step 7: Validate and apply coupon
    const {
      coupon,
      discountAmount,
      discountAmountInCustomerCurrency,
      couponAppliedItems,
      applicableSubtotal,
    } = await validateAndApplyCoupon(
      couponCode,
      formattedItems,
      productsMap,
      subtotal,
      customerCurrencyCode,
      session
    );

    // Step 8: Create order items with coupon discount
    const orderItems = createOrderItems(
      formattedItems,
      coupon,
      couponAppliedItems,
      subtotal,
      discountAmount
    );

    // Step 9: Build coupon used object
    const couponUsed = buildCouponUsedObject(
      coupon,
      applicableSubtotal,
      orderItems,
      discountAmountInCustomerCurrency,
      discountAmount
    );

    // Step 10: Calculate totals
    const totals = calculateOrderTotals(subtotal.usd, discountAmount, 0);

    const orderData = {
      customerId,
      items: orderItems.map(({ discountApplied, ...item }) => item),
      subtotal,
      couponUsed,
      shippingCost: 0,
      totalAmount: {
        vendor: subtotal.vendor - discountAmount,
        customer: subtotal.customer - discountAmount,
        usd: totals.totalAmount,
      },
      customerCurrency,
      shippingAddress: {
        addressName: shippingAddress.addressName,
        addressDetails: shippingAddress.addressDetails,
        latitude: shippingAddress.latitude,
        longitude: shippingAddress.longitude,
      },
      paymentStatus: "pending",
      paymentMethod,
      status: "pending",
      subOrders: [],
    };

    const order = await createOrder(orderData, session);

    registerActiveSession(order._id, session.id);

    const itemsByVendor = {};
    orderItems.forEach((item) => {
      const vid = item.vendorId.toString();
      if (!itemsByVendor[vid]) itemsByVendor[vid] = [];
      itemsByVendor[vid].push(item);
    });

    const subOrders = [];

    for (const [vendorId, vendorItems] of Object.entries(itemsByVendor)) {
      const vendorSubtotal = {
        vendor: vendorItems.reduce((sum, i) => sum + i.unitPrice.vendor * i.quantity, 0),
        customer: vendorItems.reduce((sum, i) => sum + i.unitPrice.customer * i.quantity, 0),
        usd: vendorItems.reduce((sum, i) => sum + i.unitPrice.usd * i.quantity, 0),
      };
      const vendorDiscount = vendorItems.reduce(
        (sum, i) => sum + (i.discountApplied || 0),
        0
      );

      let subCouponUsed = null;
      if (coupon) {
        const vendorAppliedItems = vendorItems.filter(
          (i) => (i.discountApplied || 0) > 0
        );
        if (vendorAppliedItems.length > 0) {
          subCouponUsed = {
            ...couponUsed,
            applicableSubtotal: vendorAppliedItems.reduce(
              (sum, i) => sum + i.unitPrice.usd * i.quantity,
              0
            ),
            appliedItems: vendorAppliedItems.map((i) => ({
              productId: i.product._id,
              variantId: i.variant?._id || null,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              itemTotal: i.totalPrice,
            })),
          };
        }
      }

      const subOrderNumber = `${order.orderNumber}-SUB-${new mongoose.Types.ObjectId().toString().slice(-6)}`;

      const subData = {
        subOrderNumber,
        orderId: order._id,
        vendorId,
        items: vendorItems.map(
          ({ vendorId, discountApplied, ...rest }) => rest
        ),
        subtotal: vendorSubtotal,
        couponUsed: subCouponUsed,
        shippingCost: 0,
        totalAmount: {
          vendor: vendorSubtotal.vendor - vendorDiscount,
          customer: vendorSubtotal.customer - vendorDiscount,
          usd: vendorSubtotal.usd - vendorDiscount,
        },
        customerCurrency,
        shippingAddress: order.shippingAddress,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        paymentDetails: {},
        shippingStatus: order.shippingStatus,
        shippingMethod: order.shippingMethod,
        shippingDetails: {},
        status: order.status,
        notes: "",
      };

      const sub = await SubOrderModel.create([subData], { session });
      subOrders.push(sub[0]);
    }

    order.subOrders = subOrders.map((s) => s._id);
    await order.save({ session });

    if (coupon) {
      await incrementCouponUsage(coupon._id, session);
    }

    await CartModel.findByIdAndUpdate(
      cart._id,
      { items: [] },
      { session }
    );

    await session.commitTransaction();

    unregisterActiveSession(order._id);

    // Step 17: Get the final order and transform for response
    const savedOrder = await OrderModelUser.findById(order._id).lean();

    const statusMessage =
      paymentMethod === "cash_on_delivery"
        ? getOrderMessage("order_confirmed_cod", lang)
        : getOrderMessage("order_created_awaiting_payment", lang);

    const transformedOrder = transformOrderResponse(savedOrder, lang);

    return {
      ...transformedOrder,
      statusDescription: statusMessage,
    };
  } catch (error) {
    if (session) {
      await session.abortTransaction();
    }

    if (reservedItems && reservedItems.length > 0) {
      try {
        console.log("[ORDER] Manual stock release due to error");
        await releaseMultipleStocks(reservedItems);
      } catch (releaseErr) {
        console.error(
          "[ORDER] Failed to release stock after error:",
          releaseErr
        );
      }
    }

    if (session) {
      try {
        const tempOrder = await OrderModelUser.findOne({ customerId }).sort({
          createdAt: -1,
        });
        if (tempOrder) {
          unregisterActiveSession(tempOrder._id);
        }
      } catch (e) {
        // Ignore
      }
    }

    if (
      error.message.includes("exchange rate") ||
      error.message.includes("currency conversion") ||
      error.message.includes("Currency conversion failed")
    ) {
      throw new Error(getOrderMessage("currency_conversion_failed", lang), {
        cause: 503,
      });
    }

    if (error.message.includes("Insufficient")) {
      throw new Error(error.message, { cause: 400 });
    }

    throw error;
  } finally {
    if (session) {
      session.endSession();
    }
  }
};


export const confirmOrderPayment = async (orderId, session = null) => {
  try {
    const order = await OrderModelUser.findById(orderId);
    if (!order) throw new Error("Order not found", { cause: 404 });

    if (order.paymentStatus !== "pending") {
      throw new Error(
        `Payment status is already ${order.paymentStatus}`,
        { cause: 400 }
      );
    }

    for (const item of order.items) {
      await confirmStockReservation(
        item.product._id,
        item.variant?._id || null,
        item.quantity,
        session
      );
    }

    order.paymentStatus = "paid";
    order.status = "confirmed";
    order.expireAt = undefined; // Remove expiration
    await order.save({ session });

    await SubOrderModel.updateMany(
      { orderId: order._id },
      { paymentStatus: "paid", status: "confirmed" },
      { session }
    );

    return order;
  } catch (error) {
    throw error;
  }
};


export const cancelPendingOrder = async (orderId) => {
  try {
    const order = await OrderModelUser.findById(orderId);
    if (!order) throw new Error("Order not found", { cause: 404 });

    if (order.paymentStatus !== "pending") {
      throw new Error(
        "Cannot cancel order with non-pending payment status",
        { cause: 400 }
      );
    }

    await releaseMultipleStocks(order.items);

    if (order.couponUsed?.couponId) {
      await decrementCouponUsage(order.couponUsed.couponId);
    }

    order.status = "cancelled";
    await order.save();

    await SubOrderModel.updateMany(
      { orderId: order._id },
      { status: "cancelled" }
    );

    return order;
  } catch (error) {
    throw error;
  }
};

export const getUserOrders = async (userId, options = {}) => {
  const {
    page = 1,
    limit = 10,
    sort = "createdAt",
    order = "desc",
    orderStatus,
    lang = "en",
  } = options;

  let query = { customerId: userId };

  if (orderStatus) {
    if (orderStatus === "completed") {
      query.status = { $in: ["delivered", "cancelled"] };
    } else if (orderStatus === "ongoing") {
      query.status = { $in: ["pending", "confirmed", "processing", "shipped"] };
    }
  }

  const skip = (page - 1) * limit;
  const sortOrder = order === "desc" ? -1 : 1;
  const sortObj = { [sort]: sortOrder };

  const orders = await OrderModelUser.find(query)
    .select("orderNumber items subtotal shippingCost totalAmount currency customerCurrency paymentStatus paymentMethod status createdAt")
    .sort(sortObj)
    .skip(skip)
    .limit(parseInt(limit))
    .lean();

  const formattedOrders = orders.map((order) => transformOrderResponse(order, lang));

  const total = await OrderModelUser.countDocuments(query);
  const totalPages = Math.ceil(total / limit);

  return {
    orders: formattedOrders,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
};
