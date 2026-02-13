/**
 * Helper utilities for transforming order and suborder responses
 * Provides consistent localization and role-based price selection
 */

/**
 * Extracts localized string from an object
 * @param {Object|string} obj - Localized object with {ar, en} or plain string
 * @param {string} lang - Target language ('ar' or 'en')
 * @returns {string} - Localized string
 */
const localize = (obj, lang = "en") => {
  if (!obj) return "";
  if (typeof obj === "string") return obj;
  return obj[lang] || obj.en || "";
};

/**
 * Selects appropriate price from price object based on user role
 * @param {Object} priceObj - Price object with {vendor, customer, usd}
 * @param {string} role - User role ('admin' or 'vendor')
 * @returns {number} - Selected price value
 */
const selectPriceField = (priceObj, role = "admin") => {
  if (!priceObj || typeof priceObj !== "object") return 0;
  
  if (role === "vendor") {
    return priceObj.vendor || 0;
  }
  // Default to USD for admin
  return priceObj.usd || 0;
};

/**
 * Transforms a price object to return the selected price value directly
 * @param {Object} priceObj - Price object with {vendor, customer, usd}
 * @param {string} role - User role ('admin' or 'vendor')
 * @returns {number} - Selected price value (not an object)
 */
const transformPriceObject = (priceObj, role = "admin") => {
  return selectPriceField(priceObj, role);
};

/**
 * Transforms order item for response
 * @param {Object} item - Order item
 * @param {string} lang - Target language
 * @param {string} role - User role
 * @returns {Object} - Transformed item
 */
const transformOrderItem = (item, lang, role) => {
  const transformed = { ...item };

  // Localize product information
  if (transformed.product) {
    transformed.product = {
      ...transformed.product,
      name: localize(transformed.product.name, lang),
      description: localize(transformed.product.description, lang),
      // Keep currency details for reference
      currency: transformed.product.currency,
      // Transform prices
      mainPrice: transformPriceObject(transformed.product.mainPrice, role),
      discountPrice: transformed.product.discountPrice 
        ? transformPriceObject(transformed.product.discountPrice, role)
        : undefined,
    };
  }

  // Localize variant information
  if (transformed.variant && transformed.variant.attributes) {
    transformed.variant = {
      ...transformed.variant,
      attributes: transformed.variant.attributes.map((attr) => ({
        ...attr,
        attributeName: localize(attr.attributeName, lang),
        valueName: localize(attr.valueName, lang),
      })),
      // Transform variant prices
      mainPrice: transformPriceObject(transformed.variant.mainPrice, role),
      discountPrice: transformed.variant.discountPrice
        ? transformPriceObject(transformed.variant.discountPrice, role)
        : undefined,
    };
  }

  // Transform item prices
  transformed.unitPrice = transformPriceObject(transformed.unitPrice, role);
  transformed.totalPrice = transformPriceObject(transformed.totalPrice, role);

  return transformed;
};

/**
 * Transforms coupon information for response
 * @param {Object} couponUsed - Coupon data
 * @param {string} lang - Target language
 * @param {string} role - User role
 * @returns {Object|null} - Transformed coupon data
 */
const transformCouponData = (couponUsed, lang, role) => {
  if (!couponUsed || !couponUsed.couponId) return null;

  return {
    ...couponUsed,
    discountValue: transformPriceObject(couponUsed.discountValue, role), // Direct value
    currency: couponUsed.currency,
  };
};

/**
 * Transforms order response with localization and role-based pricing
 * @param {Object} order - Order document
 * @param {string} lang - Target language ('ar' or 'en')
 * @param {string} role - User role ('admin' or 'vendor')
 * @returns {Object} - Transformed order
 */
export const transformOrderResponse = (order, lang = "en", role = "admin") => {
  if (!order) return order;

  const transformed = {
    ...order,
    // Transform all items
    items: (order.items || []).map((item) =>
      transformOrderItem(item, lang, role)
    ),
    // Transform price fields
    subtotal: transformPriceObject(order.subtotal, role),
    totalAmount: transformPriceObject(order.totalAmount, role),
    // Transform coupon data
    couponUsed: transformCouponData(order.couponUsed, lang, role),
    // Keep currency details
    customerCurrency: order.customerCurrency,
  };

  return transformed;
};

/**
 * Transforms suborder response with localization and role-based pricing
 * @param {Object} subOrder - SubOrder document
 * @param {string} lang - Target language ('ar' or 'en')
 * @param {string} role - User role ('admin' or 'vendor')
 * @returns {Object} - Transformed suborder
 */
export const transformSubOrderResponse = (subOrder, lang = "en", role = "admin") => {
  if (!subOrder) return subOrder;

  const transformed = {
    ...subOrder,
    // Transform all items
    items: (subOrder.items || []).map((item) =>
      transformOrderItem(item, lang, role)
    ),
    // Transform price fields
    subtotal: transformPriceObject(subOrder.subtotal, role),
    totalAmount: transformPriceObject(subOrder.totalAmount, role),
    // Transform coupon data
    couponUsed: transformCouponData(subOrder.couponUsed, lang, role),
    // Keep currency details
    customerCurrency: subOrder.customerCurrency,
    // Add items count for convenience
    itemsCount: (subOrder.items || []).length,
  };

  return transformed;
};
