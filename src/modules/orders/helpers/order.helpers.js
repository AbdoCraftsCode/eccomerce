import { OrderModelUser } from "../../../DB/models/orderSchemaUser.model.js";

export const calculateOrderTotals = (
  subtotal,
  discountAmount,
  shippingCost = 0,
) => {
  const totalAmount = subtotal - discountAmount + shippingCost;
  return {
    subtotal: Number(subtotal.toFixed(2)),
    discountAmount: Number(discountAmount.toFixed(2)),
    shippingCost: Number(shippingCost.toFixed(2)),
    totalAmount: Number(totalAmount.toFixed(2)),
  };
};

export const createOrderItems = (
  formattedItems,
  coupon,
  couponAppliedItems,
  subtotal,
  discountAmount,
) => {
  return formattedItems.map((item) => {
    const isDiscounted = couponAppliedItems.includes(item.productId.toString());
    let itemDiscount = 0;
    if (isDiscounted && coupon && subtotal > 0) {
      if (coupon.discountType === "percentage") {
        itemDiscount = (item.totalPrice * coupon.discountValue) / 100;
      } else if (coupon.discountType === "fixed") {
        const itemShare = (item.totalPrice / subtotal) * coupon.discountValue;
        itemDiscount = Math.min(itemShare, item.totalPrice);
      }
    }
    return {
      ...item,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice - itemDiscount,
      discountApplied: itemDiscount,
    };
  });
};

export const createOrder = async (orderData, session) => {
  const expireAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
  const order = await OrderModelUser.create([{ ...orderData, expireAt }], {
    session,
  });
  return order[0];
};
