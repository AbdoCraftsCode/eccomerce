export const getResponseMessage = (key, lang = "en") => {
  const messages = {
    en: {
      created: "FAQ created successfully",
      updated: "FAQ updated successfully",
      deleted: "FAQ deleted successfully",
      fetched: "FAQs fetched successfully",
      fetched_single: "FAQ fetched successfully",
    },
    ar: {
      created: "تم إنشاء السؤال الشائع بنجاح",
      updated: "تم تحديث السؤال الشائع بنجاح",
      deleted: "تم حذف السؤال الشائع بنجاح",
      fetched: "تم جلب الأسئلة الشائعة بنجاح",
      fetched_single: "تم جلب السؤال الشائع بنجاح",
    },
  };

  return messages[lang][key] || messages.en[key];
};

export const getFaqErrorMessage = (key, lang = "en", params = {}) => {
  const messages = {
    en: {
      not_found: "FAQ not found",
      not_authorized: "You are not authorized to perform this action",
      invalid_category: "Invalid FAQ category",
      question_required: "Both Arabic and English questions are required",
      answer_required: "Both Arabic and English answers are required",
    },
    ar: {
      not_found: "السؤال الشائع غير موجود",
      not_authorized: "غير مصرح لك بإجراء هذا الإجراء",
      invalid_category: "فئة السؤال الشائع غير صالحة",
      question_required: "السؤال بالعربية والإنجليزية مطلوب",
      answer_required: "الإجابة بالعربية والإنجليزية مطلوبة",
    },
  };

  let message = messages[lang]?.[key] || messages.en[key] || "Unexpected error";

  Object.keys(params).forEach((p) => {
    message = message.replace(`{${p}}`, params[p]);
  });

  return message;
};

export const throwError = (key, lang, params = {}, status = 400) => {
  const error = new Error(getFaqErrorMessage(key, lang, params));
  error.status = status;
  throw error;
};