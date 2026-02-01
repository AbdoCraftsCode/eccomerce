export const getResponseMessage = (key, lang = "en") => {
  const messages = {
    en: {
      created: "Offer created successfully",
      updated: "Offer updated successfully",
      deleted: "Offer deleted successfully",
      approved: "Offer approved successfully",
      rejected: "Offer rejected successfully",
      fetched: "Offers fetched successfully",
      fetched_my: "Your offers fetched successfully",
      fetched_single: "Offer fetched successfully",
    },
    ar: {
      created: "تم إنشاء العرض بنجاح",
      updated: "تم تحديث العرض بنجاح",
      deleted: "تم حذف العرض بنجاح",
      approved: "تمت الموافقة على العرض بنجاح",
      rejected: "تم رفض العرض بنجاح",
      fetched: "تم جلب العروض بنجاح",
      fetched_my: "تم جلب عروضك بنجاح",
      fetched_single: "تم جلب العرض بنجاح",
    },
  };

  return messages[lang][key] || messages.en[key];
};

export const getOfferErrorMessage = (key, lang = "en", params = {}) => {
  const messages = {
    en: {
      offer_not_found: "Offer not found",
      not_your_offer: "You can only update/delete your own offers",
      cannot_update_status: "Cannot update offer with {status} status",
      both_names_required: "Both Arabic and English names must be provided",
      products_not_owned: "Some products do not belong to you or do not exist",
      variants_not_owned: "Some variants do not belong to your products or do not exist",
      cannot_delete_active: "Cannot delete active offer",
      offer_already_processed: "Offer is already {status}",
      vendor_no_currency: "You have to determine currency first",
    },
    ar: {
      offer_not_found: "العرض غير موجود",
      not_your_offer: "يمكنك فقط تحديث/حذف عروضك الخاصة",
      cannot_update_status: "لا يمكن تحديث عرض بحالة {status}",
      both_names_required: "يجب تقديم الاسم بالعربية والإنجليزية",
      products_not_owned: "بعض المنتجات لا تخصك أو غير موجودة",
      variants_not_owned: "بعض المتغيرات لا تخص منتجاتك أو غير موجودة",
      cannot_delete_active: "لا يمكن حذف عرض نشط",
      offer_already_processed: "العرض بالفعل {status}",
      vendor_no_currency: "يجب عليك تحديد العملة أولاً",
    },
  };

  let message = messages[lang]?.[key] || messages.en[key] || "Unexpected error";

  Object.keys(params).forEach((p) => {
    message = message.replace(`{${p}}`, params[p]);
  });

  return message;
};

export const throwError = (key, lang, params = {}, status = 400) => {
  const error = new Error(getOfferErrorMessage(key, lang, params));
  error.status = status;
  throw error;
};