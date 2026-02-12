export const getResponseMessage = (key, lang = "en") => {
  const messages = {
    en: {
      fetched: "Chats fetched successfully",
      fetched_single: "Chat fetched successfully",
      chat_created: "Chat created successfully",
      message_sent: "Message sent successfully",
      upload_success: "File uploaded successfully",
      not_found: "Chat not found",
      unauthorized: "Unauthorized to access this chat",
      no_chats: "No chats found",
    },
    ar: {
      fetched: "تم جلب المحادثات بنجاح",
      fetched_single: "تم جلب المحادثة بنجاح",
      chat_created: "تم إنشاء المحادثة بنجاح",
      message_sent: "تم إرسال الرسالة بنجاح",
      upload_success: "تم تحميل الملف بنجاح",
      not_found: "المحادثة غير موجودة",
      unauthorized: "غير مصرح لك بالوصول إلى هذه المحادثة",
      no_chats: "لم يتم العثور على محادثات",
    },
  };

  return messages[lang][key] || messages.en[key];
};

export const getContactUsErrorMessage = (key, lang = "en", params = {}) => {
  const messages = {
    en: {
      not_found: "Chat not found",
      unauthorized: "You are not authorized to access this chat",
      invalid_chat_id: "Invalid chat ID format",
      no_content: "Message content is required",
      invalid_message_type: "Invalid message type",
      admin_chat_id_required: "Admin must provide chat ID",
      no_file: "No file provided",
      upload_failed: "Failed to upload file",
      invalid_file_type: "Invalid file type",
    },
    ar: {
      not_found: "المحادثة غير موجودة",
      unauthorized: "غير مصرح لك بالوصول إلى هذه المحادثة",
      invalid_chat_id: "صيغة معرف المحادثة غير صالحة",
      no_content: "محتوى الرسالة مطلوب",
      invalid_message_type: "نوع الرسالة غير صالح",
      admin_chat_id_required: "يجب على المسؤول تقديم معرف المحادثة",
      no_file: "لم يتم تقديم ملف",
      upload_failed: "فشل تحميل الملف",
      invalid_file_type: "نوع الملف غير صالح",
    },
  };

  let message = messages[lang]?.[key] || messages.en[key] || "Unexpected error";

  Object.keys(params).forEach((p) => {
    message = message.replace(`{${p}}`, params[p]);
  });

  return message;
};
