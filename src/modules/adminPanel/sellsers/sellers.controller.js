import { asyncHandelr } from "../../../utlis/response/error.response.js";
import { getSellerAndProductStatsService } from "./sellers.service.js";
import { getLastMonthSalesStatsService  } from "./sellers.service.js";
import { getAcceptedSellersWithCategories  } from "./sellers.service.js";
import { getLatestSellersService   } from "./sellers.service.js";
import { getCategorySalesService  } from "./sellers.service.js";
import { getVendorGrowthGraphService } from "./sellers.service.js";
import { getUserLanguage } from "../../../utlis/localization/langUserHelper.js";

export const getSellerAndProductStats = asyncHandelr(async (req, res) => {
  const lang = getUserLanguage(req);
    const stats = await getSellerAndProductStatsService();
  
    res.status(200).json({
      success: true,
      message:(lang=='en')? "Seller and product statistics":"إحصائيات البائع والمنتج",
      data: stats,
    });
  });

export const getLastMonthSalesStats = asyncHandelr(async (req, res) => {
    const lang = getUserLanguage(req);
    const stats = await getLastMonthSalesStatsService();
  
    res.status(200).json({
      success: true,
      message: (lang=='en')?"Last month sales and seller stats":"إحصائيات المبيعات والبائعين للشهر الماضي",
      data: stats,
    });
  });

  export const acceptedSellers = asyncHandelr(async (req, res, next) => {
    const lang = getUserLanguage(req);
    const vendors = await getAcceptedSellersWithCategories();
  
    res.status(200).json({
      success: true,
      message: (lang=='en')?"Accepted sellers with their categories fetched ✅":"تم جلب بيانات البائعين المقبولين مع فئاتهم.",
      count: vendors.length,
      data: vendors,
    });
  });

  export const getLatestSellers = asyncHandelr(async (req, res, next) => {
    const { limit = 5 } = req.query;
    const lang = getUserLanguage(req);
    const sellers = await getLatestSellersService(Number(limit), true);
  
    res.status(200).json({
      success: true,
      message: (lang=='en')?"Latest sellers fetched successfully":"تم جلب أحدث البائعين بنجاح",
      count: sellers.length,
      data: sellers,
    });
  });

  export const getCategorySales = asyncHandelr(async (req, res) => {
    const lang = getUserLanguage(req);
    const data = await getCategorySalesService(lang);
  
    res.status(200).json({
      success: true,
      message: (lang=='en')?"Sales per category":"المبيعات حسب الفئة",
      data,
    });
  });

  export const getVendorGrowthGraph = asyncHandelr(async (req, res) => {
    const lang = getUserLanguage(req);
    const data = await getVendorGrowthGraphService();
  
    res.status(200).json({
      success: true,
      message: (lang=='en')?"Vendor growth graph fetched successfully":"تم جلب رسم بياني لنمو البائعين بنجاح",
      data,
    });
  });