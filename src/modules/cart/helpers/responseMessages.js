// cart/helpers/responseMessages.js
export const getResponseMessage = (key, lang = "en") => {
  const messages = {
    en: {
      fetched: "Cart fetched successfully",
      added: "Item added to cart successfully",
      removed: "Item removed from cart successfully",
      quantity_updated: "Quantity updated successfully",
      cart_emptied: "Cart emptied successfully",
      coupon_applied: "Coupon applied successfully",
    },
    ar: {
      fetched: "تم جلب السلة بنجاح",
      added: "تم إضافة العنصر إلى السلة بنجاح",
      removed: "تم إزالة العنصر من السلة بنجاح",
      quantity_updated: "تم تحديث الكمية بنجاح",
      cart_emptied: "تم إفراغ السلة بنجاح",
      coupon_applied: "تم تطبيق الكوبون بنجاح",
    },
  };

  return messages[lang][key] || messages.en[key];
};

export const getCartErrorMessage = (key, lang = "en", params = {}) => {
  const messages = {
    en: {
      cart_not_found: "Cart not found",
      product_not_found: "Product not found",
      variant_not_found: "Variant not found for this product",
      item_exists: "Item already exists in cart",
      insufficient_stock: "Insufficient stock. Only {stock} available",
      invalid_quantity: "Quantity must be at least 1",
      invalid_action: "Invalid action. Must be 'increase' or 'decrease'",
      item_not_found: "Item not found in cart",
      cart_empty: "Cart is empty",
      product_without_currency: "There is a technical issue",
      coupon_invalid: "Invalid or inactive coupon",
      coupon_expired: "Coupon has expired",
      coupon_usage_limit: "Coupon usage limit reached",
      coupon_not_applicable: "Coupon cannot be applied to items in your cart",
      coupon_no_currency: "Coupon has no currency set",
    },
    ar: {
      cart_not_found: "السلة غير موجودة",
      product_not_found: "المنتج غير موجود",
      variant_not_found: "المتغير غير موجود لهذا المنتج",
      item_exists: "العنصر موجود بالفعل في السلة",
      insufficient_stock: "المخزون غير كافٍ. متاح فقط {stock}",
      invalid_quantity: "الكمية يجب أن تكون على الأقل 1",
      invalid_action: "إجراء غير صالح. يجب أن يكون 'increase' أو 'decrease'",
      item_not_found: "العنصر غير موجود في السلة",
      cart_empty: "السلة فارغة",
      product_without_currency: "هناك مشكلة تقنية",
      coupon_invalid: "كوبون غير صالح أو غير نشط",
      coupon_expired: "انتهت صلاحية الكوبون",
      coupon_usage_limit: "تم الوصول لحد استخدام الكوبون",
      coupon_not_applicable: "لا يمكن تطبيق الكوبون على المنتجات في السلة",
      coupon_no_currency: "الكوبون ليس له عملة محددة",
    },
  };

  let message = messages[lang]?.[key] || messages.en[key] || "Unexpected error";

  Object.keys(params).forEach((p) => {
    message = message.replace(`{${p}}`, params[p]);
  });

  return message;
};

export const throwError = (key, lang, params = {}, status = 400) => {
  const error = new Error(getCartErrorMessage(key, lang, params));
  error.status = status;
  throw error;
};