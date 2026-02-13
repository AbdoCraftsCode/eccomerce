import { getDashboardStatsService } from "./admin.service.js";
import { asyncHandelr } from "../../utlis/response/error.response.js";
import { SubOrderModel } from "../../DB/models/subOrdersSchema.model.js"; // Adjust path
import mongoose from "mongoose";
import { getUserLanguage } from "../../utlis/localization/langUserHelper.js";
import { getMonthlyDailySalesService } from "./admin.service.js";
import { getMaxDailySalesService } from "./admin.service.js";
import { getTodayHourlyStatsService } from "./admin.service.js";
import { getMaxHourSalesService } from "./admin.service.js";
import {
  getMonthlyDailySalesServiceV,
  getMaxDailySalesServiceV,
  getTodayHourlyStatsServiceV,
  getMaxHourSalesServiceV,
} from "./admin.service.js";

export const getDashboardStats = asyncHandelr(async (req, res, next) => {
  const lang = getUserLanguage(req);
  const data = await getDashboardStatsService(req.user);
  res.status(200).json({
    status: "success",
    message:
      lang == "en"
        ? "states retrieved successfully"
        : "تم استرجاع الحالات بنجاح",
    data: data,
  });
});
//===========================================
export const getMonthlyDailySales = asyncHandelr(async (req, res) => {
  const data = await getMonthlyDailySalesService();

  res.status(200).json({
    success: true,
    data,
  });
});
//=======================

export const getMaxDailySales = asyncHandelr(async (req, res) => {
  const average = await getMaxDailySalesService();

  res.status(200).json({
    success: true,
    data: {
      average,
    },
  });
});

//=========================
export const getTodayHourlyStats = asyncHandelr(async (req, res) => {
  const data = await getTodayHourlyStatsService();

  res.status(200).json({
    success: true,
    data,
  });
});
//==================
export const getMaxHourSales = asyncHandelr(async (req, res) => {
  const data = await getMaxHourSalesService();

  res.status(200).json({
    success: true,
    data,
  });
});
//-------------------=====================
// Monthly daily sales
export const getMonthlyDailySalesVendor = asyncHandelr(async (req, res) => {
  const vendorId = req.user._id;
  console.log(vendorId);
  const data = await getMonthlyDailySalesServiceV(vendorId);

  res.status(200).json({
    success: true,
    data,
  });
});

// =====================
// Max daily sales
export const getMaxDailySalesVendor = asyncHandelr(async (req, res) => {
  const vendorId = req.user._id;
  const average = await getMaxDailySalesServiceV(vendorId);

  res.status(200).json({
    success: true,
    data: { average },
  });
});

// =====================
// Today hourly stats
export const getTodayHourlyStatsVendor = asyncHandelr(async (req, res) => {
  const vendorId = req.user._id;
  const data = await getTodayHourlyStatsServiceV(vendorId);

  res.status(200).json({
    success: true,
    data,
  });
});

// =====================
// Max hour sales
export const getMaxHourSalesVendor = asyncHandelr(async (req, res) => {
  const vendorId = req.user._id;
  const data = await getMaxHourSalesServiceV(vendorId);

  res.status(200).json({
    success: true,
    data,
  });
});
