import express from "express";
import { getDashboardStats } from "./admin.controller.js";
//import { getMonthlyDailySales } from "./admin.controller.js";
//import { getMaxDailySales } from "./admin.controller.js";
import { getTodayHourlyStats } from "./admin.controller.js";
import { getMaxHourSales } from "./admin.controller.js";
//import { getMonthlyDailySalesVendor } from "./admin.controller.js";
//import { getMaxDailySalesVendor } from "./admin.controller.js";
import { getTodayHourlyStatsVendor } from "./admin.controller.js";
import { getMaxHourSalesVendor } from "./admin.controller.js";
import { getAdminGraphData, getVendorGraphData } from "./admin.controller.js";

import { getAllCustomers } from "./orders/orders.controller.js";
import { getAllOrders } from "./orders/orders.controller.js";
import { getSubOrdersByOrderId } from "./orders/orders.controller.js";
import { getAllSubOrders } from "./orders/orders.controller.js";
import { getPaymentStatusStats } from "./orders/orders.controller.js";
import {
  getDailyPaymentStats,
  getMonthlyPaymentStats,
} from "./orders/orders.controller.js";
import { getSellerAndProductStats } from "./sellsers/sellers.controller.js";
import { getLastMonthSalesStats } from "./sellsers/sellers.controller.js";
import { acceptedSellers } from "./sellsers/sellers.controller.js";
import { getLatestSellers } from "./sellsers/sellers.controller.js";
import { getCategorySales } from "./sellsers/sellers.controller.js";
import {
  getSubOrdersByVendorId,
  getSubOrderDetailsByVendorId
} from "./vendors/vendors.controller.js";
import { getLastMonthSalesAndOrders } from "./orders/orders.controller.js";
import {
  authentication,
  authorization,
} from "../../middlewere/authontcation.middlewere.js";
// VENDORS ROUTES
import { getCustomersForVendor } from "./vendors/vendors.controller.js";
import { getDailyVendorStats } from "./vendors/vendors.controller.js";
import { getMonthlyVendorStats } from "./vendors/vendors.controller.js";
import { getVendorDashboardStats } from "./vendors/vendors.controller.js";

const router = express.Router();

router.get(
  "/admin/graph-data",
  authentication(),
  authorization("Admin"),
  getAdminGraphData
);
router.get(
  "/vendor/graph-data",
  authentication(),
  authorization(["Admin", "vendor"]),
  getVendorGraphData
);

router.get(
  "/homePage",
  authentication(),
  authorization("Admin"),
  getDashboardStats
);


// router.get(
//   "/monthlyData",
//   authentication(),
//   authorization("Admin"),
//   getMonthlyDailySales
// );
// router.get(
//   "/averageMonthly",
//   authentication(),
//   authorization("Admin"),
//   getMaxDailySales
// );
// router.get(
//   "/dailyData",
//   authentication(),
//   authorization("Admin"),
//   getTodayHourlyStats
// );
// router.get(
//   "/averageDaily",
//   authentication(),
//   authorization("Admin"),
//   getMaxHourSales
// );


router.get(
  "/customers",
  authentication(),
  authorization("Admin"),
  getAllCustomers
);
router.get(
  "/allOrders",
  authentication(),
  authorization("Admin"),
  getAllOrders
);
router.get(
  "/subOrdersById/:orderId",
  authentication(),
  authorization("Admin"),
  getSubOrdersByOrderId
);
router.get(
  "/subOrders",
  authentication(),
  authorization(["Admin", "vendor"]),
  getAllSubOrders
);
router.get(
  "/paymentStatus",
  authentication(),
  authorization("Admin"),
  getPaymentStatusStats
);
router.get(
  "/paymentStatusLastDay",
  authentication(),
  authorization("Admin"),
  getDailyPaymentStats
);
router.get(
  "/paymentStatusLastMonth",
  authentication(),
  authorization("Admin"),
  getMonthlyPaymentStats
);
router.get(
  "/sellersInfo",
  authentication(),
  authorization("Admin"),
  getSellerAndProductStats
);
router.get(
  "/lastMonthSalesStats",
  authentication(),
  authorization("Admin"),
  getLastMonthSalesStats
);
router.get(
  "/sellersWithCategory",
  authentication(),
  authorization("Admin"),
  acceptedSellers
);
router.get(
  "/latestSellers",
  authentication(),
  authorization("Admin"),
  getLatestSellers
);
router.get(
  "/getstatByVendorId",
  authentication(),
  authorization("Admin"),
  getLastMonthSalesAndOrders
);
router.get(
  "/salseOfCategory",
  authentication(),
  authorization("Admin"),
  getCategorySales
);
// VENDOR ROUTIES
router.get(
  "/getCustomersByVendor",
  authentication(),
  authorization(["Admin", "vendor"]),
  getCustomersForVendor
);
router.get(
  "/homeDailyStatsForVendor",
  authentication(),
  authorization(["Admin", "vendor"]),
  getDailyVendorStats
);
router.get(
  "/homeMonthlyStatsForVendor",
  authentication(),
  authorization(["Admin", "vendor"]),
  getMonthlyVendorStats
);
router.get(
  "/getSubOrdersByVendorId",
  authentication(),
  authorization(["Admin", "vendor"]),
  getSubOrdersByVendorId
);
router.get(
  "/getSubOrderDetails/:subOrderId",
  authentication(),
  authorization(["Admin", "vendor"]),
  getSubOrderDetailsByVendorId
);
router.get(
  "/vedorStatistics",
  authentication(),
  authorization(["Admin", "vendor"]),
  getVendorDashboardStats
);

export default router;
