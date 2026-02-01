// profile/helpers/responseMessages.js
export const getResponseMessage = (key, lang = "en") => {
  const messages = {
    en: {
      updated: "Profile updated successfully",
      picture_removed: "Profile picture removed successfully",
      password_changed: "Password changed successfully",
      email_confirmed: "Email confirmed successfully",
      verification_sent: "Verification code sent to your email",
    },
    ar: {
      updated: "تم تحديث الملف الشخصي بنجاح",
      picture_removed: "تم إزالة صورة الملف الشخصي بنجاح",
      password_changed: "تم تغيير كلمة المرور بنجاح",
      email_confirmed: "تم تأكيد البريد الإلكتروني بنجاح",
      verification_sent: "تم إرسال رمز التحقق إلى بريدك الإلكتروني",
    },
  };

  return messages[lang][key] || messages.en[key];
};

export const getProfileErrorMessage = (key, lang = "en", params = {}) => {
  const messages = {
    en: {
      user_not_found: "User not found",
      upload_failed: "Failed to upload profile picture",
      no_fields: "No valid fields provided for update",
      flavor_not_found: "Preferred flavor not found",
      popgroup_not_found: "Favorite popgroup not found",
      product_type_not_found: "Product type not found",
      old_password_incorrect: "Old password is incorrect",
      no_pending_verification: "No pending email verification",
      too_many_attempts: "Too many failed attempts. Try again in 30 minutes",
      invalid_code: "Invalid verification code",
      code_expired: "Verification code has expired",
      email_not_found: "Email not found for this user",
      email_already_confirmed: "Email is already confirmed",
      invalid_country: "Invalid or inactive country",
      invalid_currency: "Invalid or inactive currency",
    },
    ar: {
      user_not_found: "المستخدم غير موجود",
      upload_failed: "فشل في تحميل صورة الملف الشخصي",
      no_fields: "لم يتم تقديم حقول صالحة للتحديث",
      flavor_not_found: "النكهة المفضلة غير موجودة",
      popgroup_not_found: "المجموعة الشعبية المفضلة غير موجودة",
      product_type_not_found: "نوع المنتج غير موجود",
      old_password_incorrect: "كلمة المرور القديمة غير صحيحة",
      no_pending_verification: "لا يوجد تحقق بريد إلكتروني معلق",
      too_many_attempts: "محاولات فاشلة كثيرة جدًا. حاول مرة أخرى بعد 30 دقيقة",
      invalid_code: "رمز التحقق غير صالح",
      code_expired: "انتهت صلاحية رمز التحقق",
      email_not_found: "البريد الإلكتروني غير موجود لهذا المستخدم",
      email_already_confirmed: "البريد الإلكتروني مؤكد بالفعل",
      invalid_country: "دولة غير صالحة أو غير نشطة",
      invalid_currency: "عملة غير صالحة أو غير نشطة",
    },
  };

  let message = messages[lang]?.[key] || messages.en[key] || "Unexpected error";

  Object.keys(params).forEach((p) => {
    message = message.replace(`{${p}}`, params[p]);
  });

  return message;
};

export const throwError = (key, lang, params = {}, status = 400) => {
  const error = new Error(getProfileErrorMessage(key, lang, params));
  error.status = status;
  throw error;
};