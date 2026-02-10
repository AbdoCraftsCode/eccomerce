import { OrderModelUser } from "../../../DB/models/orderSchemaUser.model.js";

export const calculateOrderTotals = (
  subtotal,
  discountAmount,
  shippingCost = 0
) => {
  const totalAmount = subtotal - discountAmount + shippingCost;
  return {
    subtotal: Number(subtotal.toFixed(2)),
    discountAmount: Number(discountAmount.toFixed(2)),
    shippingCost: Number(shippingCost.toFixed(2)),
    totalAmount: Number(totalAmount.toFixed(2)),
  };
};

/**
 * Create order items with coupon discount applied
 * Items now have embedded product/variant objects
 */
export const createOrderItems = (
  formattedItems,
  coupon,
  couponAppliedItems,
  subtotal,
  discountAmount
) => {
  return formattedItems.map((item) => {
    const isDiscounted = couponAppliedItems.includes(
      item.product._id.toString()
    );
    let itemDiscount = 0;

    if (isDiscounted && coupon && subtotal > 0) {
      if (coupon.discountType === "percentage") {
        itemDiscount = (item.totalPrice * coupon.discountValue) / 100;
      } else if (coupon.discountType === "fixed") {
        // Distribute fixed discount proportionally
        const itemShare = (item.totalPrice / subtotal) * discountAmount;
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
  const order = await OrderModelUser.create(
    [{ ...orderData, expireAt }],
    { session }
  );
  return order[0];
};

/**
 * Build the couponUsed object with currency details and multi-currency values
 *
 * @param {Object} coupon - The coupon document
 * @param {number} applicableSubtotal
 * @param {Array} orderItems
 * @param {number} discountAmountInCustomerCurrency
 * @param {number} discountAmountInUSD
 */
export const buildCouponUsedObject = (
  coupon,
  applicableSubtotal,
  orderItems,
  discountAmountInCustomerCurrency = 0,
  discountAmountInUSD = 0
) => {
  if (!coupon) return null;

  // Build coupon currency details
  const couponCurrency = coupon.currency
    ? {
        code: coupon.currency.code || "",
        name: {
          ar: coupon.currency.name?.ar || "",
          en: coupon.currency.name?.en || "",
        },
        symbol: coupon.currency.symbol || "",
      }
    : null;

  return {
    couponId: coupon._id,
    code: coupon.code,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    discountValueInCustomerCurrency: discountAmountInCustomerCurrency,
    discountValueInUSD: discountAmountInUSD,
    currency: couponCurrency,
    appliesTo: coupon.appliesTo,
    productId: coupon.productId?._id || null,
    categoryId: coupon.categoryId?._id || null,
    vendorId: coupon.vendorId || null,
    applicableSubtotal,
    appliedItems: orderItems
      .filter((item) => item.discountApplied > 0)
      .map((item) => ({
        productId: item.product._id,
        variantId: item.variant?._id || null,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        itemTotal: item.totalPrice,
      })),
  };
};