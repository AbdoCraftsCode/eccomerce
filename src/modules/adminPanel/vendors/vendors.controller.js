import { asyncHandelr } from "../../../utlis/response/error.response.js";
import { getCustomersForVendorService } from "../vendors/vendors.service.js";
import { getVendorStatsByDateRangeService } from "../vendors/vendors.service.js";
import { getVendorOverallStatsService } from "../vendors/vendors.service.js";
import { getVendorDashboardStatsService } from "../vendors/vendors.service.js";
import { getSubOrdersByVendorIdService } from "./vendors.service.js"

export const getCustomersForVendor = asyncHandelr(async (req, res) => {
  const vendorId = req.user._id;
  if (req.user.accountType !== "vendor") {
    throw new Error("Only vendors");
}
  const customers = await getCustomersForVendorService(vendorId);

  res.status(200).json({
    success: true,
    message: "Customers fetched successfully",
    count: customers.length,
    data: customers,
  });
});
  //===============================================
  export const getDailyVendorStats = asyncHandelr(async (req, res) => {
    if (req.user.accountType !== "vendor") {
        throw new Error("Only vendors");
    }
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
      message: "Last day vendor statistics",
      data: stats,
    });
  });
  //===================================
  export const getMonthlyVendorStats = asyncHandelr(async (req, res) => {
    const vendorId = req.user._id;
    if (req.user.accountType !== "vendor") {
        throw new Error("Only vendors");
    }
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
      message: "Last month vendor statistics",
      data: stats,
    });
  });
  //=====================================================
  export const getSubOrdersByVendorId = asyncHandelr(async (req, res) => {
    const  vendorId = req.user._id;
    if (req.user.accountType !== "vendor") {
        throw new Error("Only vendors");
    }
    console.log(vendorId);
    if (req.user.accountType !== "vendor") {
     throw new Error("Only vendors");
 }
   const result = await getSubOrdersByVendorIdService(vendorId, req.query);
 
   res.status(200).json({
     success: true,
     message: "Suborders fetched successfully",
     ...result,
   });
 });
 //=================================
 export const getVendorOverallStats = asyncHandelr(async (req, res) => {
    const vendorId = req.user._id;
    if (req.user.accountType !== "vendor") {
        throw new Error("Only vendors");
    }
    const stats = await getVendorOverallStatsService(vendorId);
  
    res.status(200).json({
      success: true,
      message: "Vendor overall statistics fetched successfully",
      data: stats,
    });
  });
  //============================
  export const getVendorDashboardStats = asyncHandelr(async (req, res) => {
    const data = await getVendorDashboardStatsService(req.user);
    if (req.user.accountType !== "vendor") {
        throw new Error("Only vendors");
    }
    res.status(200).json({
      success: true,
      message: "Vendor dashboard stats fetched successfully",
      data,
    });
  });