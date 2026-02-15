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
      discountAmount: { vendor: 0, customer: 0, usd: 0 },
      couponAppliedItems: [],
      applicableSubtotal: { vendor: 0, customer: 0, usd: 0 },
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

  // Calculate applicable subtotal in all currencies
  let applicableSubtotalUSD = applicableItems.reduce(
    (sum, item) => sum + item.totalPrice.usd,
    0
  );
  let applicableSubtotalVendor = applicableItems.reduce(
    (sum, item) => sum + item.totalPrice.vendor,
    0
  );
  let applicableSubtotalCustomer = applicableItems.reduce(
    (sum, item) => sum + item.totalPrice.customer,
    0
  );

  let discountAmountUSD = 0;
  let discountAmountVendor = 0;
  let discountAmountCustomer = 0;

  if (coupon.discountType === "percentage") {
    // Apply percentage discount to all currencies
    discountAmountUSD = (applicableSubtotalUSD * coupon.discountValue) / 100;
    discountAmountVendor = (applicableSubtotalVendor * coupon.discountValue) / 100;
    discountAmountCustomer = (applicableSubtotalCustomer * coupon.discountValue) / 100;
  } else if (coupon.discountType === "fixed") {
    // Convert fixed discount to all currencies
    try {
      const couponCurrencyCode = coupon.currency?.code || "USD";

      // Convert to USD
      const discountInUSD = await convertToUSD(
        coupon.discountValue,
        coupon.currency?._id || coupon.currency
      );
      discountAmountUSD = Math.min(discountInUSD, applicableSubtotalUSD);

      // Convert to customer currency
      const discountInCustomerCurr = await convertAmount(
        coupon.discountValue,
        couponCurrencyCode,
        customerCurrencyCode
      );
      discountAmountCustomer = Math.min(discountInCustomerCurr, applicableSubtotalCustomer);

      // For vendor currency, we need to know the vendor's currency
      // Since items can have different vendors, we'll calculate proportionally
      // The vendor discount will be calculated based on the ratio of USD discount to USD subtotal
      const discountRatio = applicableSubtotalUSD > 0 ? discountAmountUSD / applicableSubtotalUSD : 0;
      discountAmountVendor = applicableSubtotalVendor * discountRatio;
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
    discountAmount: {
      vendor: Number(discountAmountVendor.toFixed(2)),
      customer: Number(discountAmountCustomer.toFixed(2)),
      usd: Number(discountAmountUSD.toFixed(2)),
    },
    couponAppliedItems,
    applicableSubtotal: {
      vendor: Number(applicableSubtotalVendor.toFixed(2)),
      customer: Number(applicableSubtotalCustomer.toFixed(2)),
      usd: Number(applicableSubtotalUSD.toFixed(2)),
    },
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