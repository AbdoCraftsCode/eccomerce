import { OrderModelUser } from "../../../DB/models/orderSchemaUser.model.js";
import { SubOrderModel } from "../../../DB/models/subOrdersSchema.model.js";
import { ProductModellll } from "../../../DB/models/productSchemaaaa.js";
import { VariantModel } from "../../../DB/models/variantSchema.js";
import { CouponModel } from "../../../DB/models/couponSchemaaa.js";

export const cleanupExpiredOrders = async () => {
  try {
    const now = new Date();
    const expiredOrders = await OrderModelUser.find({
      paymentStatus: "pending",
      status: "pending",
      expireAt: { $lt: now }
    });
    console.log(`Found ${expiredOrders.length} expired orders`);
    for (const order of expiredOrders) {
      console.log(`Processing expired order ${order._id}`);
      await releaseStockFromExpiredOrder(order);
      if (order.couponUsed?.couponId) {
        const coupon = await CouponModel.findById(order.couponUsed.couponId);
        if (coupon) {
          coupon.usesCount = Math.max(0, coupon.usesCount - 1);
          await coupon.save();
          console.log(`Decreased usesCount for coupon ${coupon._id} to ${coupon.usesCount}`);
        }
      }
      await SubOrderModel.deleteMany({ orderId: order._id });
      await order.deleteOne();
    }
    console.log(`Cleaned up ${expiredOrders.length} expired orders`);
  } catch (error) {
    console.error("Cleanup error:", error);
  }
};

export const releaseStockFromExpiredOrder = async (order) => {
  try {
    console.log(`Releasing stock for order ${order._id}`);
    for (const item of order.items) {
      const quantity = Math.floor(item.quantity);
      if (item.variantId) {
        const variant = await VariantModel.findByIdAndUpdate(
          item.variantId,
          [
            { $set: { reservedStock: { $add: ["$reservedStock", -quantity] } } },
            { $set: { reservedStock: { $max: ["$reservedStock", 0] } } }
          ],
          { new: true }
        );
        console.log(`Variant ${item.variantId} reserved now: ${variant?.reservedStock}`);
      } else {
        const product = await ProductModellll.findByIdAndUpdate(
          item.productId,
          [
            { $set: { reservedStock: { $add: ["$reservedStock", -quantity] } } },
            { $set: { reservedStock: { $max: ["$reservedStock", 0] } } }
          ],
          { new: true }
        );
        console.log(`Product ${item.productId} reserved now: ${product?.reservedStock}`);
      }
    }
  } catch (error) {
    console.error("Release error for expired order:", error);
    throw error;
  }
};

export const startOrderCleanupJob = () => {
  setInterval(cleanupExpiredOrders, 15 * 60 * 1000);
};