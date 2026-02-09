import mongoose from "mongoose";
import { CartModel } from "../../../DB/models/cart.model.js";
import { OrderModelUser } from "../../../DB/models/orderSchemaUser.model.js";
import { SubOrderModel } from "../../../DB/models/subOrdersSchema.model.js";
import { getCartWithDetails , validateCart} from "../../cart/services/cart.service.js";
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
import { processCartItemsWithUSD } from "../helpers/order-items.helpers.js";
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


export const createOrderforUser = async (
  customerId,
  shippingAddressId,
  paymentMethod,
  couponCode = null
) => {
  let session;
  let reservedItems = [];

  try {
    session = await mongoose.startSession();
    session.startTransaction();

    const user = await validateUser(customerId);
    const shippingAddress = validateShippingAddress(user, shippingAddressId);
    validatePaymentMethod(paymentMethod);

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

    const { formattedItems, subtotal } = await processCartItemsWithUSD(
      cart,
      productsMap
    );

    await reserveAllItemsStock(formattedItems, session);
    reservedItems = formattedItems;

    const { coupon, discountAmount, couponAppliedItems, applicableSubtotal } =
      await validateAndApplyCoupon(
        couponCode,
        formattedItems,
        productsMap,
        subtotal,
        session
      );

    const orderItems = createOrderItems(
      formattedItems,
      coupon,
      couponAppliedItems,
      subtotal,
      discountAmount
    );

    const couponUsed = buildCouponUsedObject(
      coupon,
      applicableSubtotal,
      orderItems
    );

    const totals = calculateOrderTotals(subtotal, discountAmount, 0);

    const orderData = {
      customerId,
      items: orderItems.map(({ discountApplied, ...item }) => item),
      subtotal: totals.subtotal,
      discountAmount: totals.discountAmount,
      couponUsed,
      shippingCost: 0,
      totalAmount: totals.totalAmount,
      currency: "USD",
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
      const vendorSubtotal = vendorItems.reduce(
        (sum, i) => sum + i.unitPrice * i.quantity,
        0
      );
      const vendorDiscount = vendorItems.reduce(
        (sum, i) => sum + (i.discountApplied || 0),
        0
      );
      const vendorTotal = vendorSubtotal - vendorDiscount;

      // Build vendor-specific coupon data if applicable
      let subCouponUsed = null;
      if (coupon) {
        const vendorAppliedItems = vendorItems.filter(
          (i) => (i.discountApplied || 0) > 0
        );
        if (vendorAppliedItems.length > 0) {
          subCouponUsed = {
            ...couponUsed,
            applicableSubtotal: vendorAppliedItems.reduce(
              (sum, i) => sum + i.unitPrice * i.quantity,
              0
            ),
            appliedItems: vendorAppliedItems.map((i) => ({
              productId: i.productId,
              variantId: i.variantId,
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
        items: vendorItems.map(({ vendorId, discountApplied, ...rest }) => rest),
        subtotal: vendorSubtotal,
        discountAmount: vendorDiscount,
        couponUsed: subCouponUsed,
        shippingCost: 0,
        totalAmount: vendorTotal,
        currency: "USD",
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

    // Update main order with sub-order references
    order.subOrders = subOrders.map((s) => s._id);
    await order.save({ session });

    // Step 13: Increment coupon usage ONLY after order is successfully created
    if (coupon) {
      await incrementCouponUsage(coupon._id, session);
    }

    // Step 14: Clear cart
    await CartModel.findByIdAndUpdate(
      cart._id,
      { items: [] },
      { session }
    );

    // Step 15: Commit transaction - all or nothing
    await session.commitTransaction();

    // Unregister session
    unregisterActiveSession(order._id);

    // Step 16: Populate and return order
    const populatedOrder = await OrderModelUser.findById(order._id)
      .populate({
        path: "items.productId",
        select: "name images mainPrice disCountPrice currency stock",
      })
      .populate({
        path: "items.variantId",
        select: "price disCountPrice images attributes stock",
      })
      .lean();

    let statusMessage = "Your order has been created and is awaiting payment.";
    if (paymentMethod === "cash_on_delivery") {
      statusMessage =
        "Your order is confirmed — payment will be collected on delivery.";
    }

    return {
      ...populatedOrder,
      statusDescription: statusMessage,
    };
  } catch (error) {
    // Abort transaction - automatic rollback of all database changes
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

    // Unregister session if registered
    if (session) {
      try {
        const tempOrder = await OrderModelUser.findOne({ customerId }).sort({ createdAt: -1 });
        if (tempOrder) {
          unregisterActiveSession(tempOrder._id);
        }
      } catch (e) {
        // Ignore
      }
    }

    // Enhance error messages for better user experience
    if (
      error.message.includes("exchange rate") ||
      error.message.includes("currency conversion") ||
      error.message.includes("Currency conversion failed")
    ) {
      throw new Error(
        "Unable to create order: currency conversion to USD failed. Please try again later.",
        { cause: 503 }
      );
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

/**
 * Confirm order payment and convert reserved stock to actual sale
 */
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

    // Confirm stock reservation (convert reserved to sold)
    for (const item of order.items) {
      await confirmStockReservation(
        item.productId,
        item.variantId,
        item.quantity,
        session
      );
    }

    // Update order status
    order.paymentStatus = "paid";
    order.status = "confirmed";
    order.expireAt = undefined; // Remove expiration
    await order.save({ session });

    // Update sub-orders
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

/**
 * Cancel pending order and release reserved stock
 */
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

    // Release reserved stock
    await releaseMultipleStocks(order.items);

    // Decrement coupon usage
    if (order.couponUsed?.couponId) {
      await decrementCouponUsage(order.couponUsed.couponId);
    }

    // Update order status
    order.status = "cancelled";
    await order.save();

    // Update sub-orders
    await SubOrderModel.updateMany(
      { orderId: order._id },
      { status: "cancelled" }
    );

    return order;
  } catch (error) {
    throw error;
  }
};