import { asyncHandelr } from "../../../utlis/response/error.response.js";
import {
  getAllCustomersService,
  getAllOrdersService,
  getOrderDetailsByIdService,
  getSubOrdersByOrderIdService,
  getAllSubOrdersService,
  getPaymentStatusStatsService,
  getLastMonthSalesAndOrdersService,
  getCustomersByVendorService,
  getLastDayPaymentStatsService,
  getLastMonthPaymentStatsService
} from "./orders.service.js";
import { getUserLanguage } from "../../../utlis/localization/langUserHelper.js";
import { getMessage } from "../helpers/responseMessages.js";

export const getAllCustomers = asyncHandelr(async (req, res) => {
  const result = await getAllCustomersService(req.query);
  res.status(200).json({
    success: true,
    ...result,
  });
});
//----------------------------------------------------------------------------
export const getAllOrders = asyncHandelr(async (req, res) => {
  const lang = getUserLanguage(req);
  const result = await getAllOrdersService(req.query, lang);

  res.status(200).json({
    success: true,
    message: getMessage("orders_fetched_successfully", lang),
    ...result,
  });
});

export const getOrderDetailsById = asyncHandelr(async (req, res, next) => {
  const lang = getUserLanguage(req);
  const { orderId } = req.params;

  const order = await getOrderDetailsByIdService(orderId, lang);

  if (!order) {
    return next(new Error(getMessage("order_not_found", lang), { cause: 404 }));
  }

  res.status(200).json({
    success: true,
    message: getMessage("orders_fetched_successfully", lang),
    data: order,
  });
});
//-----------------------------------------------------------------------------------
export const getSubOrdersByOrderId = asyncHandelr(async (req, res, next) => {
  const lang = getUserLanguage(req);
  const { orderId } = req.params;
  
  if (!orderId) {
    return next(new Error(getMessage("order_id_required", lang), { cause: 400 }));
  }

  const subOrders = await getSubOrdersByOrderIdService(orderId, lang);

  if (!subOrders.length) {
    return next(new Error(getMessage("no_suborders_found", lang), { cause: 404 }));
  }

  res.status(200).json({
    success: true,
    message: getMessage("suborders_fetched_successfully", lang),
    count: subOrders.length,
    data: subOrders,
  });
});
//-----------------------------------------------------------------------------------------
export const getAllSubOrders = asyncHandelr(async (req, res) => {
  const lang = getUserLanguage(req);
  const result = await getAllSubOrdersService(req.query, lang);

  res.status(200).json({
    success: true,
    message: getMessage("suborders_fetched_successfully", lang),
    ...result,
  });
});

//=====================================================
export const getPaymentStatusStats = asyncHandelr(async (req, res) => {
  const lang = getUserLanguage(req);
  const data = await getPaymentStatusStatsService();

  res.status(200).json({
    success: true,
    message: getMessage("payment_status_stats_fetched", lang),
    data,
  });
});

//====================================================================
export const getDailyPaymentStats = asyncHandelr(async (req, res) => {
  const lang = getUserLanguage(req);
  const data = await getLastDayPaymentStatsService();

  res.status(200).json({
    success: true,
    message: getMessage("daily_payment_stats_fetched", lang),
    data,
  });
});

//=========================================================
export const getMonthlyPaymentStats = asyncHandelr(async (req, res) => {
  const lang = getUserLanguage(req);
  const data = await getLastMonthPaymentStatsService();

  res.status(200).json({
    success: true,
    message: getMessage("monthly_payment_stats_fetched", lang),
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
    message: getMessage("last_month_sales_fetched", lang),
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
    message: getMessage("customers_fetched_successfully", lang),
    count: data.length,
    data,
  });
});