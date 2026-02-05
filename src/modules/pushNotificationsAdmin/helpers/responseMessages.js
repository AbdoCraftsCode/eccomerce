export const getResponseMessage = (key, lang = "en") => {
  const messages = {
    en: {
      created: "Notification created successfully",
      fetched: "Notifications fetched successfully",
      fetched_stats: "Notification statistics fetched successfully",
      sent: "Notification sent successfully",
      scheduled: "Notification scheduled successfully",
    },
    ar: {
      created: "تم إنشاء الإشعار بنجاح",
      fetched: "تم جلب الإشعارات بنجاح",
      fetched_stats: "تم جلب إحصائيات الإشعارات بنجاح",
      sent: "تم إرسال الإشعار بنجاح",
      scheduled: "تم جدولة الإشعار بنجاح",
    },
  };

  return messages[lang][key] || messages.en[key];
};

export const getNotificationErrorMessage = (key, lang = "en", params = {}) => {
  const messages = {
    en: {
      not_found: "Notification not found",
      invalid_type: "Invalid notification type",
      invalid_audience: "Invalid audience type",
      invalid_procedure: "Invalid click procedure",
      title_required: "Both Arabic and English titles are required",
      body_required: "Both Arabic and English bodies are required",
      users_required: "User IDs are required for specific users",
      filters_required: "Filters are required for specific filters",
      send_at_future: "Send date must be in the future for scheduled notifications",
      no_users: "No users found for the selected audience",
      send_failed: "Failed to send notification",
    },
    ar: {
      not_found: "الإشعار غير موجود",
      invalid_type: "نوع الإشعار غير صالح",
      invalid_audience: "نوع الجمهور غير صالح",
      invalid_procedure: "إجراء النقر غير صالح",
      title_required: "العنوان بالعربية والإنجليزية مطلوب",
      body_required: "المحتوى بالعربية والإنجليزية مطلوب",
      users_required: "معرفات المستخدمين مطلوبة للمستخدمين المحددين",
      filters_required: "الفلاتر مطلوبة للفلاتر المحددة",
      send_at_future: "تاريخ الإرسال يجب أن يكون في المستقبل للإشعارات المجدولة",
      no_users: "لم يتم العثور على مستخدمين للجمهور المحدد",
      send_failed: "فشل في إرسال الإشعار",
    },
  };

  let message = messages[lang]?.[key] || messages.en[key] || "Unexpected error";

  Object.keys(params).forEach((p) => {
    message = message.replace(`{${p}}`, params[p]);
  });

  return message;
};

export const throwError = (key, lang, params = {}, status = 400) => {
  const error = new Error(getNotificationErrorMessage(key, lang, params));
  error.status = status;
  throw error;
};