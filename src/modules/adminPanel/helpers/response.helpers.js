
const localize = (obj, lang = "en") => {
  if (!obj) return "";
  if (typeof obj === "string") return obj;
  return obj[lang] || obj.en || "";
};


const selectPriceField = (priceObj, role = "admin") => {
  if (!priceObj || typeof priceObj !== "object") return 0;
  
  if (role === "vendor") {
    return priceObj.vendor || 0;
  }
  // Default to USD for admin
  return priceObj.usd || 0;
};

const transformPriceObject = (priceObj, role = "admin") => {
  return selectPriceField(priceObj, role);
};

const ensurePriceObject = (val) => {
  if (val && typeof val === "object" && (val.vendor !== undefined || val.usd !== undefined)) {
    return val;
  }
  const num = Number(val) || 0;
  return { vendor: num, customer: num, usd: num };
};

const transformOrderItem = (item, lang, role) => {
  const transformed = { ...item };

  // Localize product information
  if (transformed.product) {
    // Destructure to exclude currency
    const { currency, ...productWithoutCurrency } = transformed.product;
    
    transformed.product = {
      ...productWithoutCurrency,
      name: localize(transformed.product.name, lang),
      description: localize(transformed.product.description, lang),
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


const transformCouponData = (couponUsed, lang, role) => {
  if (!couponUsed || !couponUsed.couponId) return null;

  const { currency, ...couponWithoutCurrency } = couponUsed;

  return {
    ...couponWithoutCurrency,
    discountValue: transformPriceObject(couponUsed.discountValue, role), // Direct value
    applicableSubtotal: ensurePriceObject(couponUsed.applicableSubtotal),
    appliedItems: (couponUsed.appliedItems || []).map((item) => ({
      ...item,
      unitPrice: ensurePriceObject(item.unitPrice),
      itemTotal: ensurePriceObject(item.itemTotal),
    })),
  };
};


export const transformOrderResponse = (
  order,
  lang = "en",
  role = "admin",
  options = { showCoupon: true }
) => {
  if (!order) return order;

  // Destructure to exclude currency-related fields
  const { customerCurrency, ...orderWithoutCurrency } = order;

  const transformed = {
    ...orderWithoutCurrency,
    // Transform all items
    items: (order.items || []).map((item) =>
      transformOrderItem(item, lang, role)
    ),
    // Transform price fields
    subtotal: transformPriceObject(order.subtotal, role),
    totalAmount: transformPriceObject(order.totalAmount, role),
    // Transform coupon data
    couponUsed: options.showCoupon
      ? transformCouponData(order.couponUsed, lang, role)
      : undefined,
  };

  if (!options.showCoupon) {
    delete transformed.couponUsed;
  }

  return transformed;
};

export const transformSubOrderResponse = (
  subOrder,
  lang = "en",
  role = "admin",
  options = { showCoupon: true }
) => {
  if (!subOrder) return subOrder;

  // Destructure to exclude currency-related fields
  const { customerCurrency, ...subOrderWithoutCurrency } = subOrder;

  const transformed = {
    ...subOrderWithoutCurrency,
    // Transform all items
    items: (subOrder.items || []).map((item) =>
      transformOrderItem(item, lang, role)
    ),
    // Transform price fields
    subtotal: transformPriceObject(subOrder.subtotal, role),
    totalAmount: transformPriceObject(subOrder.totalAmount, role),
    // Transform coupon data
    couponUsed: options.showCoupon
      ? transformCouponData(subOrder.couponUsed, lang, role)
      : undefined,
    // Add items count for convenience
    itemsCount: (subOrder.items || []).length,
  };

  if (!options.showCoupon) {
    delete transformed.couponUsed;
  }

  return transformed;
};
