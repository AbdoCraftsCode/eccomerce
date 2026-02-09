import mongoose from "mongoose";
import { OrderModelUser } from "../../../DB/models/orderSchemaUser.model.js";
import { SubOrderModel } from "../../../DB/models/subOrdersSchema.model.js";
import { ProductModellll } from "../../../DB/models/productSchemaaaa.js";
import { VariantModel } from "../../../DB/models/variantSchema.js";
import { decrementCouponUsage } from "../helpers/coupon.helpers.js";

/**
 * Track active sessions to prevent cleanup during order creation
 */
const activeSessions = new Map();

export const registerActiveSession = (orderId, sessionId) => {
  activeSessions.set(orderId.toString(), sessionId);
};

export const unregisterActiveSession = (orderId) => {
  activeSessions.delete(orderId.toString());
};

/**
 * Release stock from an expired order
 */
const releaseStockFromExpiredOrder = async (order) => {
  try {
    console.log(`Releasing stock for expired order ${order._id}`);

    for (const item of order.items) {
      const quantity = Math.floor(item.quantity);

      if (item.variantId) {
        const variant = await VariantModel.findByIdAndUpdate(
          item.variantId,
          [
            { $set: { reservedStock: { $subtract: ["$reservedStock", quantity] } } },
            { $set: { reservedStock: { $max: ["$reservedStock", 0] } } },
          ],
          { new: true }
        );
        console.log(
          `Variant ${item.variantId} reserved now: ${variant?.reservedStock}`
        );
      } else {
        const product = await ProductModellll.findByIdAndUpdate(
          item.productId,
          [
            { $set: { reservedStock: { $subtract: ["$reservedStock", quantity] } } },
            { $set: { reservedStock: { $max: ["$reservedStock", 0] } } },
          ],
          { new: true }
        );
        console.log(
          `Product ${item.productId} reserved now: ${product?.reservedStock}`
        );
      }
    }
  } catch (error) {
    console.error("Release error for expired order:", error);
    throw error;
  }
};

/**
 * Clean up expired orders (run periodically)
 * Skip orders with active sessions to prevent conflicts
 */
export const cleanupExpiredOrders = async () => {
  try {
    const now = new Date();

    const expiredOrders = await OrderModelUser.find({
      paymentStatus: "pending",
      status: "pending",
      expireAt: { $lt: now },
    });

    console.log(`Found ${expiredOrders.length} expired orders`);

    for (const order of expiredOrders) {
      // Skip if order has active session
      if (activeSessions.has(order._id.toString())) {
        console.log(`Skipping order ${order._id} - has active session`);
        continue;
      }

      console.log(`Processing expired order ${order._id}`);

      // Release reserved stock
      await releaseStockFromExpiredOrder(order);

      // Decrement coupon usage if used
      if (order.couponUsed?.couponId) {
        try {
          await decrementCouponUsage(order.couponUsed.couponId);
          console.log(`Decreased coupon usage for ${order.couponUsed.couponId}`);
        } catch (couponError) {
          console.error(`Failed to decrement coupon:`, couponError);
        }
      }

      // Delete sub-orders
      await SubOrderModel.deleteMany({ orderId: order._id });

      // Delete main order
      await order.deleteOne();
    }

    console.log(`Cleaned up ${expiredOrders.length} expired orders`);
  } catch (error) {
    console.error("Cleanup error:", error);
  }
};

/**
 * Start the cleanup job (runs every 5 minutes)
 */
export const startOrderCleanupJob = () => {
  // Run immediately on startup
  cleanupExpiredOrders();
  
  // Then run every 5 minutes
  setInterval(cleanupExpiredOrders, 5 * 60 * 1000);
  
  console.log("Order cleanup job started");
};