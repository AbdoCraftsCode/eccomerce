export const getResponseMessage = (key, lang = "en") => {
  const messages = {
    en: {
      created: "Currency created successfully",
      fetched: "Currencies fetched successfully",
      fetched_single: "Currency fetched successfully",
      updated: "Currency updated successfully",
      deleted: "Currency deleted successfully",
      activated: "Currency activated successfully",
      deactivated: "Currency deactivated successfully",
      default_fetched: "Default currency fetched successfully",
      default_set: "Default currency set successfully",
      active_fetched: "Active currencies fetched successfully",
      valid: "Currency is valid",
      invalid: "Currency is invalid",
      not_found: "Currency not found",
      default_not_found: "Default currency not found",
      code_required: "Currency code is required",
    },
    ar: {
      created: "تم إنشاء العملة بنجاح",
      fetched: "تم جلب العملات بنجاح",
      fetched_single: "تم جلب العملة بنجاح",
      updated: "تم تحديث العملة بنجاح",
      deleted: "تم حذف العملة بنجاح",
      activated: "تم تفعيل العملة بنجاح",
      deactivated: "تم تعطيل العملة بنجاح",
      default_fetched: "تم جلب العملة الافتراضية بنجاح",
      default_set: "تم تعيين العملة الافتراضية بنجاح",
      active_fetched: "تم جلب العملات النشطة بنجاح",
      valid: "العملة صالحة",
      invalid: "العملة غير صالحة",
      not_found: "العملة غير موجودة",
      default_not_found: "العملة الافتراضية غير موجودة",
      code_required: "رمز العملة مطلوب",
    },
  };

  return messages[lang][key] || messages.en[key];
};

export const getCurrencyErrorMessage = (key, lang = "en", params = {}) => {
  const messages = {
    en: {
      invalid_code: "'{code}' is not a valid ISO 4217 currency code",
      code_exists: "Currency code '{code}' already exists",
      not_found: "Currency not found",
      not_active: "Currency '{code}' is not active",
      cannot_delete_default:
        "Cannot delete default currency. Set another as default first.",
      cannot_deactivate_default:
        "Cannot deactivate default currency. Set another as default first.",
      assigned_to_users:
        "Cannot delete currency. It is currently assigned to users.",
    },
    ar: {
      invalid_code: "رمز العملة '{code}' غير صالح حسب معيار ISO 4217",
      code_exists: "رمز العملة '{code}' موجود بالفعل",
      not_found: "العملة غير موجودة",
      not_active: "العملة '{code}' غير مفعلة",
      cannot_delete_default:
        "لا يمكن حذف العملة الافتراضية. قم بتعيين عملة أخرى أولاً.",
      cannot_deactivate_default:
        "لا يمكن تعطيل العملة الافتراضية. قم بتعيين عملة أخرى أولاً.",
      assigned_to_users:
        "لا يمكن حذف العملة. هي مستخدمة حالياً من قبل المستخدمين.",
    },
  };

  let message = messages[lang]?.[key] || messages.en[key] || "Unexpected error";

  Object.keys(params).forEach((p) => {
    message = message.replace(`{${p}}`, params[p]);
  });

  return message;
};
