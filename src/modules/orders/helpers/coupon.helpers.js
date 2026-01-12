// coupon.helpers.js
import { CouponModel } from "../../../DB/models/couponSchemaaa.js";

export const validateAndApplyCoupon = async (couponCode, formattedItems, productsMap, subtotal, session = null) => {
  if (!couponCode) {
    return { coupon: null, discountAmount: 0, couponAppliedItems: [] };
  }
  const trimmedCode = couponCode.trim().toUpperCase();
  const coupon = await CouponModel.findOne({
    code: trimmedCode,
    isActive: true,
  }).populate("productId").session(session); // Add session for atomicity
  if (!coupon) {
    throw new Error("Coupon code is invalid or inactive", { cause: 400 });
  }
  if (coupon.expiryDate && new Date(coupon.expiryDate) < new Date()) {
    throw new Error("Coupon has expired", { cause: 400 });
  }
  if (coupon.usesCount >= coupon.maxUses) {
    throw new Error("Coupon usage limit has been reached", { cause: 400 });
  }
  let applicableItems = [];
  let applicableSubtotal = 0;
  if (coupon.appliesTo === "all_products") {
    const itemsFromVendor = formattedItems.filter((item) => {
      const product = productsMap[item.productId.toString()];
      return (
        product && product.createdBy.toString() === coupon.vendorId.toString()
      );
    });
    if (itemsFromVendor.length > 0) {
      applicableItems = itemsFromVendor;
      applicableSubtotal = itemsFromVendor.reduce(
        (sum, item) => sum + item.totalPrice,
        0
      );
    }
  } else if (coupon.appliesTo === "single_product") {
    const productForCoupon = Object.values(productsMap).find(
      (p) => p._id.toString() === coupon.productId._id.toString()
    );
    if (
      productForCoupon &&
      productForCoupon.createdBy.toString() === coupon.vendorId.toString()
    ) {
      const itemsFromProduct = formattedItems.filter(
        (item) =>
          item.productId.toString() === coupon.productId._id.toString()
      );
      if (itemsFromProduct.length > 0) {
        applicableItems = itemsFromProduct;
        applicableSubtotal = itemsFromProduct.reduce(
          (sum, item) => sum + item.totalPrice,
          0
        );
      }
    }
  }
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
    item.productId.toString()
  );
  return { coupon, discountAmount, couponAppliedItems };
};