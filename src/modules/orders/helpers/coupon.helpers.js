import { CouponModel } from "../../../DB/models/couponSchemaaa.js";
import { convertToUSD } from "../../currency/services/currency.service.js";
import { getExchangeRate } from "../../auth/service/changeCurrencyHelper.service.js";

/**
 * Convert an amount from one currency to another
 */
const convertAmount = async (amount, fromCode, toCode) => {
  if (!amount || isNaN(parseFloat(amount))) return 0;
  const val = parseFloat(amount);
  if (fromCode === toCode) return Number(val.toFixed(6));

  const rate = await getExchangeRate(fromCode, toCode);
  if (!rate || rate <= 0) {
    throw new Error(
      `Failed to get exchange rate from ${fromCode} to ${toCode}`,
      { cause: 503 }
    );
  }
  return Number((val * rate).toFixed(6));
};

/**
 * Validate and apply coupon with USD conversion
 * Coupons are NOT incremented until order is successfully created
 *
 * @param {string} couponCode
 * @param {Array} formattedItems - Items with embedded product objects
 * @param {Object} productsMap
 * @param {number} subtotal
 * @param {string} customerCurrencyCode - Customer's preferred currency code
 * @param {Object} session
 */
export const validateAndApplyCoupon = async (
  couponCode,
  formattedItems,
  productsMap,
  subtotal,
  customerCurrencyCode = "USD",
  session = null
) => {
  if (!couponCode) {
    return {
      coupon: null,
      discountAmount: 0,
      discountAmountInCustomerCurrency: 0,
      couponAppliedItems: [],
      applicableSubtotal: 0,
    };
  }

  const trimmedCode = couponCode.trim().toUpperCase();

  const coupon = await CouponModel.findOne({
    code: trimmedCode,
    isActive: true,
  })
    .populate("productId categoryId currency")
    .session(session);

  if (!coupon) {
    throw new Error("coupon_invalid", { cause: 400 });
  }

  if (coupon.expiryDate && new Date(coupon.expiryDate) < new Date()) {
    throw new Error("coupon_expired", { cause: 400 });
  }

  if (coupon.usesCount >= coupon.maxUses) {
    throw new Error("coupon_usage_limit", { cause: 400 });
  }

  // Filter applicable items based on coupon rules
  // Items now have embedded product object with _id
  let applicableItems = formattedItems.filter((item) => {
    const productId = item.product._id.toString();
    const product = productsMap[productId];
    if (!product) return false;

    // Vendor matching
    const matchesVendor =
      !coupon.vendorId ||
      product.createdBy.toString() === coupon.vendorId.toString();
    if (!matchesVendor) return false;

    // Apply based on coupon type
    if (coupon.appliesTo === "all_products") {
      return true;
    } else if (coupon.appliesTo === "single_product") {
      return productId === coupon.productId?._id.toString();
    } else if (coupon.appliesTo === "category") {
      return product.categories.some(
        (cat) => cat.toString() === coupon.categoryId?._id.toString()
      );
    }

    return false;
  });

  if (applicableItems.length === 0) {
    throw new Error("coupon_not_applicable", { cause: 400 });
  }

  // Calculate applicable subtotal (already in USD)
  let applicableSubtotal = applicableItems.reduce(
    (sum, item) => sum + item.totalPrice,
    0
  );

  let discountAmount = 0;
  let discountAmountInCustomerCurrency = 0;

  if (coupon.discountType === "percentage") {
    discountAmount = (applicableSubtotal * coupon.discountValue) / 100;

    // For percentage, customer currency discount is the same percentage
    // applied to customer currency subtotal — but since we store absolute values,
    // we convert the USD discount to customer currency
    discountAmountInCustomerCurrency = await convertAmount(
      discountAmount,
      "USD",
      customerCurrencyCode
    );
  } else if (coupon.discountType === "fixed") {
    // Convert fixed discount to USD
    try {
      const couponCurrencyCode =
        coupon.currency?.code || "USD";

      const discountInUSD = await convertToUSD(
        coupon.discountValue,
        coupon.currency?._id || coupon.currency
      );
      discountAmount = Math.min(discountInUSD, applicableSubtotal);

      // Convert to customer currency
      discountAmountInCustomerCurrency = await convertAmount(
        coupon.discountValue,
        couponCurrencyCode,
        customerCurrencyCode
      );
    } catch (error) {
      throw new Error(
        `Failed to convert coupon discount: ${error.message}`,
        { cause: 503 }
      );
    }
  }

  const couponAppliedItems = applicableItems.map((item) =>
    item.product._id.toString()
  );

  return {
    coupon,
    discountAmount,
    discountAmountInCustomerCurrency,
    couponAppliedItems,
    applicableSubtotal,
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
      $max: { usesCount: 0 },
    },
    { session }
  );
};