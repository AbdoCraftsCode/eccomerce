import { CouponModel } from "../../../DB/models/couponSchemaaa.js";
import { convertToUSD } from "../../currency/services/currency.service.js";

/**
 * Validate and apply coupon with USD conversion
 * Coupons are NOT incremented until order is successfully created
 */
export const validateAndApplyCoupon = async (
  couponCode,
  formattedItems,
  productsMap,
  subtotal,
  session = null
) => {
  if (!couponCode) {
    return { coupon: null, discountAmount: 0, couponAppliedItems: [] };
  }

  const trimmedCode = couponCode.trim().toUpperCase();

  const coupon = await CouponModel.findOne({
    code: trimmedCode,
    isActive: true,
  })
    .populate("productId categoryId currency")
    .session(session);

  if (!coupon) {
    throw new Error("Coupon code is invalid or inactive", { cause: 400 });
  }

  if (coupon.expiryDate && new Date(coupon.expiryDate) < new Date()) {
    throw new Error("Coupon has expired", { cause: 400 });
  }

  if (coupon.usesCount >= coupon.maxUses) {
    throw new Error("Coupon usage limit has been reached", { cause: 400 });
  }

  // Filter applicable items based on coupon rules
  let applicableItems = formattedItems.filter((item) => {
    const product = productsMap[item.productId.toString()];
    if (!product) return false;

    // Vendor matching (if coupon has vendorId, it's vendor-specific)
    const matchesVendor =
      !coupon.vendorId ||
      product.createdBy.toString() === coupon.vendorId.toString();
    if (!matchesVendor) return false;

    // Apply based on coupon type
    if (coupon.appliesTo === "all_products") {
      return true;
    } else if (coupon.appliesTo === "single_product") {
      return product._id.toString() === coupon.productId?._id.toString();
    } else if (coupon.appliesTo === "category") {
      // Check if product belongs to the specific category
      return product.categories.some(
        (cat) => cat.toString() === coupon.categoryId?._id.toString()
      );
    }

    return false;
  });

  if (applicableItems.length === 0) {
    throw new Error("Coupon does not apply to any items in your cart", {
      cause: 400,
    });
  }

  // Calculate applicable subtotal (already in USD)
  let applicableSubtotal = applicableItems.reduce(
    (sum, item) => sum + item.totalPrice,
    0
  );

  let discountAmount = 0;

  if (coupon.discountType === "percentage") {
    discountAmount = (applicableSubtotal * coupon.discountValue) / 100;
  } else if (coupon.discountType === "fixed") {
    // Convert fixed discount to USD
    try {
      const discountInUSD = await convertToUSD(
        coupon.discountValue,
        coupon.currency?._id || coupon.currency
      );
      discountAmount = Math.min(discountInUSD, applicableSubtotal);
    } catch (error) {
      throw new Error(
        `Failed to convert coupon discount to USD: ${error.message}`,
        { cause: 503 }
      );
    }
  }

  const couponAppliedItems = applicableItems.map((item) =>
    item.productId.toString()
  );

  return { 
    coupon, 
    discountAmount, 
    couponAppliedItems,
    applicableSubtotal 
  };
};

/**
 * Increment coupon usage count (called only after order creation succeeds)
 */
export const incrementCouponUsage = async (couponId, session = null) => {
  await CouponModel.findByIdAndUpdate(
    couponId,
    { $inc: { usesCount: 1 } },
    { session }
  );
};

/**
 * Decrement coupon usage count (rollback on order cancellation/expiry)
 */
export const decrementCouponUsage = async (couponId, session = null) => {
  await CouponModel.findByIdAndUpdate(
    couponId,
    { 
      $inc: { usesCount: -1 },
      $max: { usesCount: 0 }
    },
    { session }
  );
};