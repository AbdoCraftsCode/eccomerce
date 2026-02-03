export const getResponseMessage = (key, lang = "en") => {
  const messages = {
    en: {
      created: "Slider created successfully",
      fetched: "Sliders fetched successfully",
      fetched_single: "Slider fetched successfully",
      updated: "Slider updated successfully",
      deleted: "Slider deleted successfully",
    },
    ar: {
      created: "تم إنشاء الشريحة بنجاح",
      fetched: "تم جلب الشرائح بنجاح",
      fetched_single: "تم جلب الشريحة بنجاح",
      updated: "تم تحديث الشريحة بنجاح",
      deleted: "تم حذف الشريحة بنجاح",
    },
  };

  return messages[lang][key] || messages.en[key];
};

export const getSliderErrorMessage = (key, lang = "en", params = {}) => {
  const messages = {
    en: {
      not_found: "Slider not found",
      invalid_type: "Invalid slider type",
      ref_required: "referenceId is required for non-default sliders",
      invalid_ref: "Invalid reference ID for selected type",
      no_image: "Image is required for slider",
      duplicate_slider: "there is same slide already"
    },
    ar: {
      not_found: "الشريحة غير موجودة",
      invalid_type: "نوع الشريحة غير صالح",
      ref_required: "معرف المرجع مطلوب للشرائح غير الافتراضية",
      invalid_ref: "معرف مرجع غير صالح للنوع المحدد",
      no_image: "الصورة مطلوبة للشريحة",
      duplicate_slider: "هناك شريحة بنفس البيانات موجودة بالفعل"
    },
  };

  let message = messages[lang]?.[key] || messages.en[key] || "Unexpected error";

  Object.keys(params).forEach((p) => {
    message = message.replace(`{${p}}`, params[p]);
  });

  return message;
};

export const throwError = (key, lang, params = {}, status = 400) => {
  const error = new Error(getSliderErrorMessage(key, lang, params));
  error.status = status;
  throw error;
};