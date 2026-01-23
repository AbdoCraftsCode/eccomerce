import { CouponModel } from "../../../DB/models/couponSchemaaa.js";

export const validateAndApplyCoupon = async (
  couponCode,
  formattedItems,
  productsMap,
  subtotal,
  session = null,
) => {
  if (!couponCode) {
    return { coupon: null, discountAmount: 0, couponAppliedItems: [] };
  }
  const trimmedCode = couponCode.trim().toUpperCase();
  const coupon = await CouponModel.findOne({
    code: trimmedCode,
    isActive: true,
  })
    .populate("productId categoryId")
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
  let applicableItems = formattedItems.filter((item) => {
    const product = productsMap[item.productId.toString()];
    if (!product) return false;
    const matchesVendor =
      !coupon.vendorId ||
      product.createdBy.toString() === coupon.vendorId.toString();
    if (!matchesVendor) return false;
    if (coupon.appliesTo === "all_products") {
      return true;
    } else if (coupon.appliesTo === "single_product") {
      return product._id.toString() === coupon.productId?._id.toString();
    } else if (coupon.appliesTo === "category") {
      return product.categories.some(
        (cat) => cat.toString() === coupon.categoryId?._id.toString(),
      );
    }
    return false;
  });
  let applicableSubtotal = applicableItems.reduce(
    (sum, item) => sum + item.totalPrice,
    0,
  );
  let discountAmount = 0;
  if (applicableItems.length > 0) {
    if (coupon.discountType === "percentage") {
      discountAmount = (applicableSubtotal * coupon.discountValue) / 100;
    } else if (coupon.discountType === "fixed") {
      discountAmount = Math.min(coupon.discountValue, applicableSubtotal);
    }
    coupon.usesCount += 1;
    await coupon.save({ session });
  }
  const couponAppliedItems = applicableItems.map((item) =>
    item.productId.toString(),
  );
  return { coupon, discountAmount, couponAppliedItems };
};
