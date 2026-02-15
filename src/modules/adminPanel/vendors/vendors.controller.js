import { asyncHandelr } from "../../../utlis/response/error.response.js";
import {
  getCustomersForVendorService,
  getVendorStatsByDateRangeService,
  getVendorOverallStatsService,
  getVendorDashboardStatsService,
  getSubOrdersByVendorIdService,
  getSubOrderDetailsByVendorIdService
} from "./vendors.service.js";
import { getUserLanguage } from "../../../utlis/localization/langUserHelper.js";
import { getMessage } from "../helpers/responseMessages.js";

export const getCustomersForVendor = asyncHandelr(async (req, res) => {
  const vendorId = req.user._id;
  const lang = getUserLanguage(req);
  const customers = await getCustomersForVendorService(vendorId);

  res.status(200).json({
    success: true,
    message: getMessage("customers_fetched_successfully", lang),
    count: customers.length,
    data: customers,
  });
});
  //===============================================
  export const getDailyVendorStats = asyncHandelr(async (req, res) => {
    const lang = getUserLanguage(req);
    const vendorId = req.user._id;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 1);
  
    const stats = await getVendorStatsByDateRangeService(
      vendorId,
      startDate,
      endDate
    );
  
    res.status(200).json({
      success: true,
      message: getMessage("vendor_stats_daily", lang),
      data: stats,
    });
  });
  //===================================
  export const getMonthlyVendorStats = asyncHandelr(async (req, res) => {
    const vendorId = req.user._id;
    const lang = getUserLanguage(req);
    const now = new Date();
  
    const firstDayLastMonth = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1,
      0,
      0,
      0
    );
  
    const lastDayLastMonth = new Date(
      now.getFullYear(),
      now.getMonth(),
      0,
      23,
      59,
      59
    );
  
    const stats = await getVendorStatsByDateRangeService(
      vendorId,
      firstDayLastMonth,
      lastDayLastMonth
    );
  
    res.status(200).json({
      success: true,
      message: getMessage("vendor_stats_monthly", lang),
      data: stats,
    });
  });
  //=====================================================
  export const getSubOrdersByVendorId = asyncHandelr(async (req, res, next) => {
    const vendorId = req.user._id;
    const lang = getUserLanguage(req);
    
    if (req.user.accountType !== "vendor") {
      return next(new Error(getMessage("only_vendors_allowed", lang), { cause: 403 }));
    }
    
    const result = await getSubOrdersByVendorIdService(vendorId, req.query, lang);
  
    res.status(200).json({
      success: true,
      message: getMessage("suborders_fetched_successfully", lang),
      ...result,
    });
  });
  //=================================
  export const getSubOrderDetailsByVendorId = asyncHandelr(async (req, res, next) => {
    const { subOrderId } = req.params;
    const vendorId = req.user._id;
    const lang = getUserLanguage(req);
    
    if (req.user.accountType !== "vendor") {
      return next(new Error(getMessage("only_vendors_allowed", lang), { cause: 403 }));
    }

    const subOrder = await getSubOrderDetailsByVendorIdService(subOrderId, vendorId, lang);

    if (!subOrder) {
      return next(new Error(getMessage("no_suborders_found", lang), { cause: 404 }));
    }
  
    res.status(200).json({
      success: true,
      message: getMessage("suborders_fetched_successfully", lang),
      data: subOrder,
    });
  });
 //=================================
 export const getVendorOverallStats = asyncHandelr(async (req, res) => {
  const lang = getUserLanguage(req);
    const vendorId = req.user._id;
    const stats = await getVendorOverallStatsService(vendorId);
  
    res.status(200).json({
      success: true,
      message: getMessage("vendor_overall_stats_fetched", lang),
      data: stats,
    });
  });
  //============================
  export const getVendorDashboardStats = asyncHandelr(async (req, res) => {
    const lang = getUserLanguage(req);
    const data = await getVendorDashboardStatsService(req.user, lang);
    res.status(200).json({
      success: true,
      message: getMessage("vendor_dashboard_stats_fetched", lang),
      data,
    });
  });