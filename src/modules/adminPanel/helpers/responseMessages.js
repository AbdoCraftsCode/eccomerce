/**
 * Localized response messages for admin panel
 */

const messages = {
  // Order messages
  orders_fetched_successfully: {
    en: "Orders fetched successfully",
    ar: "تم استلام الطلبات بنجاح",
  },
  order_not_found: {
    en: "Order not found",
    ar: "الطلب غير موجود",
  },
  order_id_required: {
    en: "Order ID is required",
    ar: "معرف الطلب مطلوب",
  },

  // Suborder messages
  suborders_fetched_successfully: {
    en: "Suborders fetched successfully",
    ar: "تم جلب الطلبات الفرعية بنجاح",
  },
  no_suborders_found: {
    en: "No suborders found for this order",
    ar: "لم يتم العثور على طلبات فرعية لهذا الطلب",
  },
  suborder_not_found: {
    en: "Suborder not found",
    ar: "الطلب الفرعي غير موجود",
  },

  // Customer messages
  customers_fetched_successfully: {
    en: "Customers fetched successfully",
    ar: "تم استلام العملاء بنجاح",
  },

  // Stats messages
  payment_status_stats_fetched: {
    en: "Payment status statistics fetched successfully",
    ar: "تم جلب إحصائيات حالة الدفع بنجاح",
  },
  daily_payment_stats_fetched: {
    en: "Last daily payment statistics fetched successfully",
    ar: "تم جلب إحصائيات الدفعات اليومية الأخيرة بنجاح",
  },
  monthly_payment_stats_fetched: {
    en: "Last monthly payment statistics fetched successfully",
    ar: "تم جلب إحصائيات الدفعة الشهرية الأخيرة بنجاح",
  },
  last_month_sales_fetched: {
    en: "Last month sales and orders fetched successfully",
    ar: "تم تحقيق مبيعات وطلبات الشهر الماضي بنجاح",
  },

  // Vendor messages
  vendor_stats_daily: {
    en: "Last day vendor statistics",
    ar: "إحصائيات البائعين في اليوم الأخير",
  },
  vendor_stats_monthly: {
    en: "Last month vendor statistics",
    ar: "إحصائيات البائعين للشهر الماضي",
  },
  vendor_overall_stats_fetched: {
    en: "Vendor overall statistics fetched successfully",
    ar: "تم جلب الإحصائيات العامة للبائع بنجاح",
  },
  vendor_dashboard_stats_fetched: {
    en: "Vendor dashboard stats fetched successfully",
    ar: "تم جلب إحصائيات لوحة معلومات البائع بنجاح",
  },
  only_vendors_allowed: {
    en: "Only vendors are allowed to access this resource",
    ar: "يُسمح للبائعين فقط بالوصول إلى هذا المورد",
  },

  // Error messages
  vendor_id_required: {
    en: "Vendor ID is required",
    ar: "معرف البائع مطلوب",
  },
  invalid_currency: {
    en: "Invalid currency specified",
    ar: "العملة المحددة غير صالحة",
  },
};

/**
 * Get localized message
 * @param {string} key - Message key
 * @param {string} lang - Language code ('en' or 'ar')
 * @returns {string} - Localized message
 */
export const getMessage = (key, lang = "en") => {
  if (!messages[key]) {
    console.warn(`Message key "${key}" not found`);
    return key;
  }
  return messages[key][lang] || messages[key].en;
};
