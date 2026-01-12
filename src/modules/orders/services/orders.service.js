import mongoose from "mongoose";
import { CartModel } from "../../../DB/models/cart.model.js";
import { OrderModelUser } from "../../../DB/models/orderSchemaUser.model.js";
import { CouponModel } from "../../../DB/models/couponSchemaaa.js";
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
import {
  getVendors,
  createVendorsMap,
  validateVendors,
  getVendorAddressesMap,
} from "../helpers/vendor.helpers.js";
import { processCartItems } from "../helpers/order-items.helpers.js";
import { validateAndApplyCoupon } from "../helpers/coupon.helpers.js";
import {
  calculateOrderTotals,
  createOrderItems,
  createOrder,
} from "../helpers/order.helpers.js";
import {
  reserveAllItemsStock,
  releaseReservedStock,
  confirmStockReservation,
} from "../helpers/stock.helpers.js";

export const createOrderforUser = async (
  customerId,
  shippingAddressId,
  paymentMethod,
  couponCode = null
) => {
  let session;
  let cart;
  let formattedItems;
  try {
    session = await mongoose.startSession();
    session.startTransaction();

    const user = await validateUser(customerId);
    cart = await getCartWithDetails(customerId);
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
        ? variantsMap[
            item.variantId._id?.toString() || item.variantId.toString()
          ]
        : null,
    }));

    const { vendors, vendorIds } = await getVendors(products);
    const vendorsMap = createVendorsMap(vendors);
    validateVendors(products, vendorsMap);

    const vendorAddressesMap = getVendorAddressesMap(vendorIds, vendorsMap);

    const processedItems = processCartItems(
      cart,
      productsMap,
      vendorAddressesMap
    );
    formattedItems = processedItems.formattedItems;
    const subtotal = processedItems.subtotal;

    await reserveAllItemsStock(formattedItems, session);

    const itemsByVendor = {};
    formattedItems.forEach((item) => {
      const vendorId =
        productsMap[item.productId.toString()].createdBy.toString();
      if (!itemsByVendor[vendorId]) {
        itemsByVendor[vendorId] = [];
      }
      itemsByVendor[vendorId].push(item);
    });

    const orders = [];
    let grandTotal = 0;
    let couponApplied = false;
    let couponDetails = null;

    // Load coupon once if provided
    let coupon = null;
    if (couponCode) {
      const { coupon: loadedCoupon } = await validateAndApplyCoupon(
        couponCode,
        [], // Dummy, no apply yet
        productsMap,
        0,
        session
      );
      coupon = loadedCoupon;
      couponDetails = coupon
        ? {
            couponId: coupon._id,
            code: coupon.code,
            discountType: coupon.discountType,
            discountValue: coupon.discountValue,
            appliesTo: coupon.appliesTo,
            appliedToProductId:
              coupon.appliesTo === "single_product"
                ? coupon.productId?._id
                : null,
          }
        : null;
    }

    for (const [vendorId, vendorItems] of Object.entries(itemsByVendor)) {
      const vendorSubtotal = vendorItems.reduce(
        (sum, item) => sum + item.totalPrice,
        0
      );

      // Apply coupon if matches this vendor
      let discountAmount = 0;
      let couponAppliedItems = [];
      if (coupon && coupon.vendorId.toString() === vendorId) {
        const applyResult = await validateAndApplyCoupon(
          couponCode,
          vendorItems,
          productsMap,
          vendorSubtotal,
          session
        );
        discountAmount = applyResult.discountAmount;
        couponAppliedItems = applyResult.couponAppliedItems;
        couponApplied = true;
      }

      const shippingCost = 0; // Per vendor if needed
      const totals = calculateOrderTotals(
        vendorSubtotal,
        discountAmount,
        shippingCost
      );

      const orderItems = createOrderItems(
        vendorItems,
        coupon,
        couponAppliedItems,
        vendorSubtotal,
        discountAmount
      );

      const orderData = {
        paymentMethod,
        customerId,
        vendorId: vendorId,
        items: orderItems,
        subtotal: totals.subtotal,
        discountAmount: totals.discountAmount,
        couponUsed:
          coupon && coupon.vendorId.toString() === vendorId
            ? couponDetails
            : null,
        shippingCost,
        totalAmount: totals.totalAmount,
        currency: "USD",
        shippingAddress: {
          addressName: shippingAddress.addressName,
          addressDetails: shippingAddress.addressDetails,
          latitude: shippingAddress.latitude,
          longitude: shippingAddress.longitude,
        },
        paymentStatus: "pending",
        status: "pending",
      };
      const order = await createOrder(orderData, session);
      orders.push(order);
      grandTotal += totals.totalAmount;
    }

    // If coupon was loaded but not applied to any vendor, revert usesCount if increased (though dummy didn't increase)
    if (coupon && !couponApplied && coupon.usesCount > 0) {
      coupon.usesCount -= 1;
      await coupon.save({ session });
    }

    // Clear cart after success
    await CartModel.findByIdAndUpdate(cart._id, { items: [] }, { session });

    await session.commitTransaction();
    session.endSession();
    return { orders, grandTotal };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    throw error;
  }
};

export const confirmOrderPayment = async (orderId, session = null) => {
  try {
    const order = await OrderModelUser.findById(orderId);
    if (!order) throw new Error("Order not found");
    if (order.paymentStatus !== "pending")
      throw new Error(`Status already ${order.paymentStatus}`);

    for (const item of order.items) {
      await confirmStockReservation(
        item.productId,
        item.variantId,
        item.quantity,
        session
      );
    }

    order.paymentStatus = "paid";
    order.status = "confirmed";
    order.expireAt = undefined;
    await order.save({ session });
    return order;
  } catch (error) {
    throw error;
  }
};

export const cancelPendingOrder = async (orderId) => {
  try {
    const order = await OrderModelUser.findById(orderId);
    if (!order) throw new Error("Order not found");
    if (order.paymentStatus !== "pending")
      throw new Error("Cannot cancel non-pending");

    for (const item of order.items) {
      await releaseReservedStock(item.productId, item.variantId, item.quantity);
    }

    // Decrease coupon usesCount if used
    if (order.couponUsed?.couponId) {
      const coupon = await CouponModel.findById(order.couponUsed.couponId);
      if (coupon) {
        coupon.usesCount = Math.max(0, coupon.usesCount - 1);
        await coupon.save();
        console.log(
          `Decreased usesCount for coupon ${coupon._id} to ${coupon.usesCount}`
        );
      }
    }

    order.status = "cancelled";
    await order.save();
    return order;
  } catch (error) {
    throw error;
  }
};
