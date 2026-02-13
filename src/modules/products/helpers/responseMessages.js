export const getResponseMessage = (key, lang = "en") => {
  const messages = {
    en: {
      updated: "Product updated successfully",
      offer_set: "Offer set on products successfully",
      products_fetched: "Products fetched successfully",
      product_fetched: "Product fetched successfully",
    },
    ar: {
      updated: "تم تحديث المنتج بنجاح",
      offer_set: "تم تعيين العرض على المنتجات بنجاح",
      products_fetched: "تم جلب المنتجات بنجاح",
      product_fetched: "تم جلب المنتج بنجاح",
    },
  };

  return messages[lang][key] || messages.en[key];
};

export const getProductErrorMessage = (key, lang = "en", params = {}) => {
  const messages = {
    en: {
      products_in_active_offer:"there are products in offer",
      products_not_owned: "Some products do not belong to you or do not exist",
      variants_not_owned: "Some variants do not belong to your products or do not exist",
      not_found: "Product not found",
      no_products_found: "No products found matching your criteria",
      invalid_price_range: "Invalid price range: minimum price cannot be greater than maximum price",
      invalid_product_id: "Invalid product ID format",
      currency_conversion_technical_issue: "There is a technical issue with currency conversion. Please try again later.",
    },
    ar: {
      products_in_active_offer:"يوجد منتجات في عرض ",
      products_not_owned: "بعض المنتجات لا تخصك أو غير موجودة",
      variants_not_owned: "بعض المتغيرات لا تخص منتجاتك أو غير موجودة",
      not_found: "المنتج غير موجود",
      no_products_found: "لا توجد منتجات تطابق معايير البحث",
      invalid_price_range: "نطاق السعر غير صالح: الحد الأدنى للسعر لا يمكن أن يكون أكبر من الحد الأقصى",
      invalid_product_id: "تنسيق معرف المنتج غير صالح",
      currency_conversion_technical_issue: "يوجد مشكلة تقنية في تحويل العملة. يرجى المحاولة مرة أخرى لاحقاً.",
    },
  };

  let message = messages[lang]?.[key] || messages.en[key] || "Unexpected error";

  Object.keys(params).forEach((p) => {
    message = message.replace(`{${p}}`, params[p]);
  });

  return message;
};

export const throwError = (key, lang, params = {}, status = 400) => {
  const error = new Error(getProductErrorMessage(key, lang, params));
  error.status = status;
  throw error;
};