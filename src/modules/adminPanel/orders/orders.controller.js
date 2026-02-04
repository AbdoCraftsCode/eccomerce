import { asyncHandelr } from "../../../utlis/response/error.response.js";
import { getAllCustomersService } from "./orders.service.js";
import { getAllOrdersService  } from "./orders.service.js";
import { getSubOrdersByOrderIdService } from "./orders.service.js";
import { getAllSubOrdersService } from "./orders.service.js";
import { getPaymentStatusStatsService } from "./orders.service.js";
import { getLastMonthSalesAndOrdersService  } from "./orders.service.js";
import { getCustomersByVendorService  } from "./orders.service.js";
import { getLastDayPaymentStatsService ,getLastMonthPaymentStatsService  } from "./orders.service.js";
import { getUserLanguage } from "../../../utlis/localization/langUserHelper.js";

export const getAllCustomers = asyncHandelr(async (req, res) => {
  const lang = getUserLanguage(req);
  const customers = await getAllCustomersService();
  res.status(200).json({
    success: true,
    count: customers.length,
    data: customers,
  });
});
//----------------------------------------------------------------------------
export const getAllOrders = asyncHandelr(async (req, res) => {
  const lang = getUserLanguage(req);
  const result = await getAllOrdersService(req.query);

  res.status(200).json({
    success: true,
    message: (lang)?"Orders fetched successfully":"تم استلام الطلبات بنجاح",
    ...result,
  });
});
//-----------------------------------------------------------------------------------
export const getSubOrdersByOrderId = asyncHandelr(async (req, res, next) => {
  const lang = getUserLanguage(req);
  const { orderId } = req.params;
  console.log(orderId);
  if (!orderId) {
    return next(new Error("Order ID is required", { cause: 400 }));
  }

  const subOrders = await getSubOrdersByOrderIdService(orderId);

  if (!subOrders.length) {
    return next(new Error("No suborders found for this order", { cause: 404 }));
  }

  res.status(200).json({
    success: true,
    count: subOrders.length,
    data: subOrders,
  });
});
//-----------------------------------------------------------------------------------------
export const getAllSubOrders = asyncHandelr(async (req, res) => {
  const lang = getUserLanguage(req);
  const result = await getAllSubOrdersService(req.query);

  res.status(200).json({
    success: true,
    ...result,
  });
});

//=====================================================
export const getPaymentStatusStats = asyncHandelr(async (req, res) => {
  const lang = getUserLanguage(req);
  const data = await getPaymentStatusStatsService();

  res.status(200).json({
    success: true,
    message:(lang=='en') ?"Payment status statistics fetched successfully":"تم جلب إحصائيات حالة الدفع بنجاح",
    data,
  });
});

//====================================================================
export const getDailyPaymentStats = asyncHandelr(async (req, res) => {
  const lang = getUserLanguage(req);
  const data = await getLastDayPaymentStatsService();

  res.status(200).json({
    success: true,
    message:(lang=='en')? "Last daily payment statistics fetched successfully":"تم جلب إحصائيات الدفعات اليومية الأخيرة بنجاح",
    data,
  });
});

//=========================================================
export const getMonthlyPaymentStats = asyncHandelr(async (req, res) => {
  const lang = getUserLanguage(req);
  const data = await getLastMonthPaymentStatsService();

  res.status(200).json({
    success: true,
    message: (lang=='en')?"Last monthly payment statistics fetched successfully":"تم جلب إحصائيات الدفعة الشهرية الأخيرة بنجاح",
    data,
  });
});

//====================================

//=======================
export const getLastMonthSalesAndOrders = asyncHandelr(async (req, res) => {
  const vendorId = req.user._id; // current vendor
  const lang = getUserLanguage(req);
  const stats = await getLastMonthSalesAndOrdersService(vendorId);

  res.status(200).json({
    success: true,
    message: (lang=='en')?"Last month sales and orders fetched successfully":"تم تحقيق مبيعات وطلبات الشهر الماضي بنجاح",
    data: stats,
  });
});
//==========================
export const getCustomersByVendor = asyncHandelr(async (req, res) => {
  const vendorId = req.user._id.toString();
  const lang = getUserLanguage(req);
  const data = await getCustomersByVendorService(vendorId);

  res.status(200).json({
    success: true,
    message: (lang=='en')?"Customers fetched successfully":"تم استلام العملاء بنجاح",
    count: data.length,
    data,
  });
});