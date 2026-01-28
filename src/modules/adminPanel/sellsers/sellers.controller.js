import { asyncHandelr } from "../../../utlis/response/error.response.js";
import { getSellerAndProductStatsService } from "./sellers.service.js";
import { getLastMonthSalesStatsService  } from "./sellers.service.js";
import { getAcceptedSellersWithCategories  } from "./sellers.service.js";
import { getLatestSellersService   } from "./sellers.service.js";
import { getAcceptedVendorByIdService, getRefusedVendorByIdService } from "./sellers.service.js";

export const getSellerAndProductStats = asyncHandelr(async (req, res) => {
    if (req.user.accountType !== "Admin") {
        throw new Error("Only admin");
    }
    const stats = await getSellerAndProductStatsService();
  
    res.status(200).json({
      success: true,
      message: "Seller and product statistics",
      data: stats,
    });
  });
//===================================================================
export const getLastMonthSalesStats = asyncHandelr(async (req, res) => {
    if (req.user.accountType !== "Admin") {
        throw new Error("Only admin");
    }
    const stats = await getLastMonthSalesStatsService();
  
    res.status(200).json({
      success: true,
      message: "Last month sales and seller stats",
      data: stats,
    });
  });
  //=============================
  export const acceptedSellers = asyncHandelr(async (req, res, next) => {
    if (req.user.accountType !== "Admin") {
        throw new Error("Only admin");
    }
    const vendors = await getAcceptedSellersWithCategories();
  
    res.status(200).json({
      success: true,
      message: "Accepted sellers with their categories fetched ✅",
      count: vendors.length,
      data: vendors,
    });
  });
  //=========================================
  export const getLatestSellers = asyncHandelr(async (req, res, next) => {
    const { limit = 5 } = req.query;
    if (req.user.accountType !== "Admin") {
        throw new Error("Only admin");
    }
    const sellers = await getLatestSellersService(Number(limit), true);
  
    res.status(200).json({
      success: true,
      message: "Latest sellers fetched successfully",
      count: sellers.length,
      data: sellers,
    });
  });
  //===========================================
  // ✅ ACCEPTED vendor
export const getAcceptedVendorById = asyncHandelr(async (req, res, next) => {
    const { vendorId } = req.params;
    if (req.user.accountType !== "Admin") {
        throw new Error("Only admin");
    }
    const vendor = await getAcceptedVendorByIdService(vendorId);
  
    if (!vendor) {
      return next(
        new Error("Vendor not found or not ACCEPTED", { cause: 404 })
      );
    }
  
    res.status(200).json({
      success: true,
      data: vendor,
    });
  });
  
  // ❌ REFUSED vendor==================================================================
  export const getRefusedVendorById = asyncHandelr(async (req, res, next) => {
    const { vendorId } = req.params;
    if (req.user.accountType !== "Admin") {
        throw new Error("Only admin");
    }
    const vendor = await getRefusedVendorByIdService(vendorId);
  
    if (!vendor) {
      return next(
        new Error("Vendor not found or not REFUSED", { cause: 404 })
      );
    }
  
    res.status(200).json({
      success: true,
      data: vendor,
    });
  });