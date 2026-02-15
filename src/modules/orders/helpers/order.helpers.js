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

    if (isDiscounted && coupon && subtotal.usd > 0) {
      if (coupon.discountType === "percentage") {
        itemDiscount = (item.totalPrice.usd * coupon.discountValue) / 100;
      } else if (coupon.discountType === "fixed") {
        // Distribute fixed discount proportionally using USD values
        const itemShare = (item.totalPrice.usd / subtotal.usd) * discountAmount.usd;
        itemDiscount = Math.min(itemShare, item.totalPrice.usd);
      }
    }

    return {
      ...item,
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
 * @param {Object} applicableSubtotal - {vendor, customer, usd}
 * @param {Array} orderItems
 * @param {Object} discountAmount - Discount amounts in all currencies {vendor, customer, usd}
 */
export const buildCouponUsedObject = (
  coupon,
  applicableSubtotal,
  orderItems,
  discountAmount = { vendor: 0, customer: 0, usd: 0 }
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
    discountValue: {
      vendor: Number(discountAmount.vendor.toFixed(2)),
      customer: Number(discountAmount.customer.toFixed(2)),
      usd: Number(discountAmount.usd.toFixed(2)),
    },
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
        unitPrice: {
          vendor: item.unitPrice.vendor,
          customer: item.unitPrice.customer,
          usd: item.unitPrice.usd,
        },
        itemTotal: {
          vendor: item.totalPrice.vendor,
          customer: item.totalPrice.customer,
          usd: item.totalPrice.usd,
        },
      })),
  };
};