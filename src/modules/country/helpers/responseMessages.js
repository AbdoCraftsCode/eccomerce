export const getResponseMessage = (key, lang = "en") => {
  const messages = {
    en: {
      created: "Country created successfully",
      fetched: "Countries fetched successfully",
      fetched_single: "Country fetched successfully",
      updated: "Country updated successfully",
      deleted: "Country deleted successfully",
      activated: "Country activated successfully",
      deactivated: "Country deactivated successfully",
      default_fetched: "Default country fetched successfully",
      default_set: "Default country set successfully",
      active_fetched: "Active countries fetched successfully",
      valid: "Country is valid",
      invalid: "Country is invalid",
      not_found: "Country not found",
      default_not_found: "Default country not found",
      code_required: "Country phone code is required",
    },
    ar: {
      created: "تم إنشاء الدولة بنجاح",
      fetched: "تم جلب الدول بنجاح",
      fetched_single: "تم جلب الدولة بنجاح",
      updated: "تم تحديث الدولة بنجاح",
      deleted: "تم حذف الدولة بنجاح",
      activated: "تم تفعيل الدولة بنجاح",
      deactivated: "تم تعطيل الدولة بنجاح",
      default_fetched: "تم جلب الدولة الافتراضية بنجاح",
      default_set: "تم تعيين الدولة الافتراضية بنجاح",
      active_fetched: "تم جلب الدول النشطة بنجاح",
      valid: "الدولة صالحة",
      invalid: "الدولة غير صالحة",
      not_found: "الدولة غير موجودة",
      default_not_found: "الدولة الافتراضية غير موجودة",
      code_required: "رمز الهاتف للدولة مطلوب",
    },
  };

  return messages[lang][key] || messages.en[key];
};

export const getCountryErrorMessage = (key, lang = "en", params = {}) => {
  const messages = {
    en: {
      invalid_name: "'{name}' is not a valid country name",
      name_exists: "Country name '{name}' already exists",
      not_found: "Country not found",
      not_active: "Country '{name}' is not active",
      cannot_delete_default:
        "Cannot delete default country. Set another as default first.",
      cannot_deactivate_default:
        "Cannot deactivate default country. Set another as default first.",
      assigned_to_users:
        "Cannot delete country. It is currently assigned to users.",
      invalid_country: "this country is not found or not active",
    },
    ar: {
      invalid_name: "اسم الدولة '{name}' غير صالح",
      name_exists: "اسم الدولة '{name}' موجود بالفعل",
      not_found: "الدولة غير موجودة",
      not_active: "الدولة '{name}' غير مفعلة",
      cannot_delete_default:
        "لا يمكن حذف الدولة الافتراضية. قم بتعيين دولة أخرى أولاً.",
      cannot_deactivate_default:
        "لا يمكن تعطيل الدولة الافتراضية. قم بتعيين دولة أخرى أولاً.",
      assigned_to_users:
        "لا يمكن حذف الدولة. هي مستخدمة حالياً من قبل المستخدمين.",
      invalid_country: "هذه الدولة غير موجودة أو غير مفعلة",
    },
  };

  let message = messages[lang]?.[key] || messages.en[key] || "Unexpected error";

  Object.keys(params).forEach((p) => {
    message = message.replace(`{${p}}`, params[p]);
  });

  return message;
};

export const throwError = (key, lang, params = {}, status = 400) => {
  const error = new Error(getCountryErrorMessage(key, lang, params));
  error.status = status;
  throw error;
};
