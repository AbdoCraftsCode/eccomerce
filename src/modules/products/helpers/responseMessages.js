export const getResponseMessage = (key, lang = "en") => {
  const messages = {
    en: {
      updated: "Product updated successfully",
      offer_set: "Offer set on products successfully",
    },
    ar: {
      updated: "تم تحديث المنتج بنجاح",
      offer_set: "تم تعيين العرض على المنتجات بنجاح",
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
    },
    ar: {
      products_in_active_offer:"يوجد منتجات في عرض ",
      products_not_owned: "بعض المنتجات لا تخصك أو غير موجودة",
      variants_not_owned: "بعض المتغيرات لا تخص منتجاتك أو غير موجودة",
      not_found: "المنتج غير موجود",
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