const messages = {
  order_created_awaiting_payment: {
    en: "Your order has been created and is awaiting payment.",
    ar: "تم إنشاء طلبك وهو في انتظار الدفع.",
  },
  order_confirmed_cod: {
    en: "Your order is confirmed — payment will be collected on delivery.",
    ar: "تم تأكيد طلبك — سيتم تحصيل الدفع عند التوصيل.",
  },
  coupon_invalid: {
    en: "Coupon code is invalid or inactive.",
    ar: "كود الكوبون غير صحيح أو غير مفعل.",
  },
  coupon_expired: {
    en: "Coupon has expired.",
    ar: "الكوبون منتهي الصلاحية.",
  },
  coupon_usage_limit: {
    en: "Coupon usage limit has been reached.",
    ar: "تم استنفاد عدد استخدامات هذا الكوبون.",
  },
  coupon_not_applicable: {
    en: "Coupon does not apply to any items in your cart.",
    ar: "هذا الكوبون لا ينطبق على أي منتج في سلتك.",
  },
  cart_empty: {
    en: "Your cart is empty.",
    ar: "سلتك فارغة.",
  },
  cart_invalid_items: {
    en: "Your cart has no valid items.",
    ar: "لا توجد عناصر صالحة في سلتك.",
  },
  user_not_found: {
    en: "User not found.",
    ar: "المستخدم غير موجود.",
  },
  shipping_address_required: {
    en: "Shipping address is required.",
    ar: "عنوان التوصيل مطلوب.",
  },
  shipping_address_not_found: {
    en: "Shipping address not found.",
    ar: "عنوان التوصيل غير موجود.",
  },
  shipping_address_missing_coords: {
    en: "Shipping address is missing coordinates.",
    ar: "عنوان التوصيل يفتقد الإحداثيات.",
  },
  invalid_payment_method: {
    en: "Invalid payment method.",
    ar: "طريقة الدفع غير صحيحة.",
  },
  products_unavailable: {
    en: "One or more products are no longer available.",
    ar: "واحد أو أكثر من المنتجات لم يعد متاحاً.",
  },
  variants_unavailable: {
    en: "Some variants are no longer available.",
    ar: "بعض الأصناف لم تعد متاحة.",
  },
  currency_conversion_failed: {
    en: "Currency conversion failed. Cannot process order at this time.",
    ar: "فشل تحويل العملة. لا يمكن معالجة الطلب في الوقت الحالي.",
  },
  order_creation_failed: {
    en: "Order creation failed. Please try again.",
    ar: "فشل إنشاء الطلب. يرجى المحاولة مرة أخرى.",
  },
  order_not_found: {
    en: "Order not found.",
    ar: "الطلب غير موجود.",
  },
  order_cancelled: {
    en: "Order has been cancelled successfully.",
    ar: "تم إلغاء الطلب بنجاح.",
  },
  payment_confirmed: {
    en: "Payment confirmed successfully.",
    ar: "تم تأكيد الدفع بنجاح.",
  },
};

export const getOrderMessage = (key, lang = "en") => {
  const message = messages[key];
  if (!message) return key;
  return message[lang] || message.en || key;
};

export const getResponseMessage = (key, lang = "en") => {
  const responseMessages = {
    en: {
      fetched: "Orders fetched successfully",
      not_found: "Order not found",
      no_orders: "No orders found",
    },
    ar: {
      fetched: "تم جلب الطلبات بنجاح",
      not_found: "الطلب غير موجود",
      no_orders: "لا توجد طلبات",
    },
  };

  return responseMessages[lang][key] || responseMessages.en[key];
};

export const getOrderErrorMessage = (key, lang = "en", params = {}) => {
  const errorMessages = {
    en: {
      not_found: "Order not found",
      unauthorized: "You are not authorized to view this order",
    },
    ar: {
      not_found: "الطلب غير موجود",
      unauthorized: "غير مصرح لك بعرض هذا الطلب",
    },
  };

  let message = errorMessages[lang]?.[key] || errorMessages.en[key] || "Unexpected error";

  Object.keys(params).forEach((p) => {
    message = message.replace(`{${p}}`, params[p]);
  });

  return message;
};

export const throwError = (key, lang, params = {}, status = 400) => {
  const error = new Error(getOrderErrorMessage(key, lang, params));
  error.status = status;
  throw error;
};
