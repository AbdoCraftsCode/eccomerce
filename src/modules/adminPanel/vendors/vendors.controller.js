import { asyncHandelr } from "../../../utlis/response/error.response.js";
import { getCustomersForVendorService } from "../vendors/vendors.service.js";
import { getVendorStatsByDateRangeService } from "../vendors/vendors.service.js";
import { getVendorOverallStatsService } from "../vendors/vendors.service.js";
import { getVendorDashboardStatsService } from "../vendors/vendors.service.js";
import { getSubOrdersByVendorIdService } from "./vendors.service.js";
import { getUserLanguage } from "../../../utlis/localization/langUserHelper.js";

export const getCustomersForVendor = asyncHandelr(async (req, res) => {
  const vendorId = req.user._id;
  const lang = getUserLanguage(req);
  const customers = await getCustomersForVendorService(vendorId);

  res.status(200).json({
    success: true,
    message:(lang == 'en')? "Customers fetched successfully":"تم استلام العملاء بنجاح",
    count: customers.length,
    data: customers,
  });
});
  //===============================================
  export const getDailyVendorStats = asyncHandelr(async (req, res) => {
    const lang = getUserLanguage(req);
    const vendorId = req.user._id;
    // console.log(vendorId);
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
      message:(lang=='en')? "Last day vendor statistics":"إحصائيات البائعين في اليوم الأخير",
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
    // console.log(firstDayLastMonth);
    // console.log(lastDayLastMonth);
    const stats = await getVendorStatsByDateRangeService(
      vendorId,
      firstDayLastMonth,
      lastDayLastMonth
    );
  

    res.status(200).json({
      success: true,
      message: (lang=='en')?"Last month vendor statistics":"إحصائيات البائعين للشهر الماضي",
      data: stats,
    });
  });
  //=====================================================
  export const getSubOrdersByVendorId = asyncHandelr(async (req, res) => {
    const  vendorId = req.user._id;
      const lang = getUserLanguage(req);
    console.log(vendorId);
    if (req.user.accountType !== "vendor") {
     throw new Error("Only vendors");
 }
   const result = await getSubOrdersByVendorIdService(vendorId, req.query);
 
   res.status(200).json({
     success: true,
     message: (lang=='en')?"Suborders fetched successfully":"تم جلب الطلبات الفرعية بنجاح",
     ...result,
   });
 });
 //=================================
 export const getVendorOverallStats = asyncHandelr(async (req, res) => {
  const lang = getUserLanguage(req);
    const vendorId = req.user._id;
    const stats = await getVendorOverallStatsService(vendorId);
  
    res.status(200).json({
      success: true,
      message:(lang=='en')? "Vendor overall statistics fetched successfully":"تم جلب الإحصائيات العامة للبائع بنجاح",
      data: stats,
    });
  });
  //============================
  export const getVendorDashboardStats = asyncHandelr(async (req, res) => {
    const lang = getUserLanguage(req);
    const data = await getVendorDashboardStatsService(req.user);
    res.status(200).json({
      success: true,
      message: (lang=='en')?"Vendor dashboard stats fetched successfully":"تم جلب إحصائيات لوحة معلومات البائع بنجاح",
      data,
    });
  });