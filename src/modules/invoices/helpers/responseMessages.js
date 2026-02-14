/**
 * Localized response messages for invoice operations
 */

const messages = {
  invoices_fetched: {
    en: "Invoices retrieved successfully",
    ar: "تم جلب الفواتير بنجاح",
  },
  invoice_fetched: {
    en: "Invoice retrieved successfully",
    ar: "تم جلب الفاتورة بنجاح",
  },
  order_not_found: {
    en: "Order not found",
    ar: "الطلب غير موجود",
  },
  order_not_paid: {
    en: "Order is not paid yet",
    ar: "الطلب غير مدفوع بعد",
  },
  invalid_order_id: {
    en: "Invalid order ID",
    ar: "معرف الطلب غير صالح",
  },
};

/**
 * Get localized response message
 * @param {string} key - Message key
 * @param {string} lang - Language code ('en' or 'ar')
 * @returns {string} - Localized message
 */
export const getInvoiceMessage = (key, lang = "en") => {
  return messages[key]?.[lang] || messages[key]?.en || key;
};
