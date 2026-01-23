// services/order.service.js - Updated to manually set subOrderNumber without hook
import mongoose from "mongoose";
import { CartModel } from "../../../DB/models/cart.model.js";
import { OrderModelUser } from "../../../DB/models/orderSchemaUser.model.js";
import { SubOrderModel } from "../../../DB/models/subOrdersSchema.model.js"; // Assuming path
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
  validateProductsAvailability,
  createProductsMap,
  fetchVariantsForCart,
} from "../helpers/product.helpers.js";
import { processCartItems } from "../helpers/order-items.helpers.js";
import { validateAndApplyCoupon } from "../helpers/coupon.helpers.js";
import {
  calculateOrderTotals,
  createOrderItems,
  createOrder,
} from "../helpers/order.helpers.js";
import {
  reserveAllItemsStock,
  confirmStockReservation,
  releaseReservedStock,
} from "../helpers/stock.helpers.js";
import { convertToUSD } from "../helpers/productCurrency.helper.js";

export const createOrderforUser = async (
  customerId,
  shippingAddressId,
  paymentMethod,
  couponCode = null
) => {
  let session;
  let formattedItems = []; // to be used in catch block for release

  try {
    session = await mongoose.startSession();
    session.startTransaction();

    const user = await validateUser(customerId);
    const cart = await getCartWithDetails(customerId);
    validateCart(cart);

    const shippingAddress = validateShippingAddress(user, shippingAddressId);
    validatePaymentMethod(paymentMethod);

    const { products, productIds } = await validateProductsAvailability(
      cart.items,
      session
    );

    const productsMap = createProductsMap(products);
    const variantsMap = await fetchVariantsForCart(cart.items, session);

    cart.items = cart.items.map((item) => ({
      ...item,
      variantId: item.variantId
        ? variantsMap[item.variantId._id?.toString() || item.variantId.toString()]
        : null,
    }));

    const processedItems = processCartItems(cart, productsMap);
    formattedItems = processedItems.formattedItems; // save for release in catch
    const subtotal = processedItems.subtotal;

    // Step 1: Reserve stock first
    await reserveAllItemsStock(formattedItems, session);

    // Step 2: Convert ALL prices to USD — fail fast if any conversion fails
    const usdFormattedItems = await Promise.all(
      formattedItems.map(async (item) => {
        const product = productsMap[item.productId.toString()];
        const fromCurrency = product?.currency?.toUpperCase() || "USD";

        const unitPriceUSD = await convertToUSD(item.unitPrice, fromCurrency);
        const totalPriceUSD = await convertToUSD(item.totalPrice, fromCurrency);

        return {
          ...item,
          unitPrice: unitPriceUSD,
          totalPrice: totalPriceUSD,
        };
      })
    );

    // If we reached here → all conversions succeeded
    const subtotalUSD = usdFormattedItems.reduce((sum, i) => sum + i.totalPrice, 0);

    // Step 3: Apply coupon (now on USD values)
    let discountAmount = 0;
    let coupon = null;
    let couponAppliedItems = [];
    let couponUsed = null;

    if (couponCode) {
      const applyResult = await validateAndApplyCoupon(
        couponCode,
        usdFormattedItems,
        productsMap,
        subtotalUSD,
        session
      );
      coupon = applyResult.coupon;
      discountAmount = applyResult.discountAmount;
      couponAppliedItems = applyResult.couponAppliedItems;

      if (coupon) {
        couponUsed = {
          couponId: coupon._id,
          code: coupon.code,
          discountType: coupon.discountType,
          discountValue: coupon.discountValue,
          appliesTo: coupon.appliesTo,
          productId: coupon.productId?._id || null,
          categoryId: coupon.categoryId?._id || null,
          vendorId: coupon.vendorId || null,
          applicableSubtotal: applyResult.applicableSubtotal || 0,
          appliedItems: [],
        };
      }
    }

    const orderItems = createOrderItems(
      usdFormattedItems,
      coupon,
      couponAppliedItems,
      subtotalUSD,
      discountAmount
    );

    if (couponUsed) {
      couponUsed.appliedItems = orderItems
        .filter((item) => item.discountApplied > 0)
        .map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          itemTotal: item.totalPrice,
        }));

      couponUsed.applicableSubtotal = orderItems
        .filter((item) => item.discountApplied > 0)
        .reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    }

    const totals = calculateOrderTotals(subtotalUSD, discountAmount, 0);

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

    const itemsByVendor = {};
    orderItems.forEach((item) => {
      const vid = item.vendorId.toString();
      if (!itemsByVendor[vid]) itemsByVendor[vid] = [];
      itemsByVendor[vid].push(item);
    });

    const subOrders = [];
    let subCount = 1;

    for (const [vendorId, vendorItems] of Object.entries(itemsByVendor)) {
      const vendorSubtotal = vendorItems.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
      const vendorDiscount = vendorItems.reduce((sum, i) => sum + (i.discountApplied || 0), 0);
      const vendorTotal = vendorSubtotal - vendorDiscount;

      let subCouponUsed = null;
      if (coupon) {
        const vendorAppliedItems = vendorItems.filter((i) => (i.discountApplied || 0) > 0);
        if (vendorAppliedItems.length > 0) {
          subCouponUsed = {
            ...couponUsed,
            applicableSubtotal: vendorAppliedItems.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0),
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

    order.subOrders = subOrders.map((s) => s._id);
    await order.save({ session });

    // Clear cart
    await CartModel.findByIdAndUpdate(cart._id, { items: [] }, { session });

    await session.commitTransaction();

    // Populate before returning (as in your previous version)
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
      statusMessage = "Your order is confirmed — payment will be collected on delivery.";
    }

    return {
      ...populatedOrder,
      statusDescription: statusMessage,
    };
  } catch (error) {
    if (session) {
      await session.abortTransaction();
    }

    // Release reserved stock if we reached that point
    if (formattedItems && formattedItems.length > 0) {
      try {
        for (const item of formattedItems) {
          await releaseReservedStock(
            item.productId,
            item.variantId,
            item.quantity
          );
        }
        console.log("[ORDER] Stock released due to failure");
      } catch (releaseErr) {
        console.error("[ORDER] Failed to release stock after error:", releaseErr);
      }
    }

    // Throw specific message for currency failure
    if (error.message.includes("exchange rate") || error.message.includes("currency")) {
      throw new Error(
        "Unable to create order: currency conversion to USD failed. Please try again later.",
        { cause: 503 }
      );
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
    if (order.paymentStatus !== "pending")
      throw new Error(`Status already ${order.paymentStatus}`, { cause: 400 });
    for (const item of order.items) {
      await confirmStockReservation(
        item.productId,
        item.variantId,
        item.quantity,
        session,
      );
    }
    order.paymentStatus = "paid";
    order.status = "confirmed";
    order.expireAt = undefined;
    await order.save({ session });
    await SubOrderModel.updateMany(
      { orderId: order._id },
      { paymentStatus: "paid", status: "confirmed" },
      { session },
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
    if (order.paymentStatus !== "pending")
      throw new Error("Cannot cancel non-pending", { cause: 400 });
    for (const item of order.items) {
      await releaseReservedStock(item.productId, item.variantId, item.quantity);
    }
    if (order.couponUsed?.couponId) {
      const coupon = await CouponModel.findById(order.couponUsed.couponId);
      if (coupon) {
        coupon.usesCount = Math.max(0, coupon.usesCount - 1);
        await coupon.save();
      }
    }
    order.status = "cancelled";
    await order.save();
    await SubOrderModel.updateMany(
      { orderId: order._id },
      { status: "cancelled" },
    );
    return order;
  } catch (error) {
    throw error;
  }
};
