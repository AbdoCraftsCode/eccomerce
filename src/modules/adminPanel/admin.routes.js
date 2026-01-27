import express from "express";
import { getDashboardStats } from "./admin.controller.js";
import { getAllCustomers } from "./orders/orders.controller.js";
import { getLatestOrders } from "./orders/orders.controller.js";
import { getSubOrdersByOrderId } from "./orders/orders.controller.js";
import { getAllSubOrders } from "./orders/orders.controller.js";
import { getPaymentStatusStats } from "./orders/orders.controller.js";
import { getDailyPaymentStats,getMonthlyPaymentStats } from "./orders/orders.controller.js";
import { getSellerAndProductStats } from "./sellsers/sellers.controller.js";
import { getLastMonthSalesStats } from "./sellsers/sellers.controller.js";
import { acceptedSellers } from "./sellsers/sellers.controller.js";
import { getLatestSellers } from "./sellsers/sellers.controller.js";
import { getAcceptedVendorById, getRefusedVendorById } from "./sellsers/sellers.controller.js";
import { getSubOrdersByVendorId} from "./orders/orders.controller.js";
import { authentication, authorization } from "../../middlewere/authontcation.middlewere.js";


const router = express.Router();

router.get("/homePage",authentication() , getDashboardStats);
router.get("/customers", authentication() , getAllCustomers);
router.get("/latestOrders",authentication() , getLatestOrders);
router.get("/subOrdersById/:orderId",authentication(), getSubOrdersByOrderId);
router.get("/subOrders", authentication() ,getAllSubOrders);
router.get("/paymentStatus", authentication() , getPaymentStatusStats);
router.get("/paymentStatusLastDay", authentication() , getDailyPaymentStats);
router.get("/paymentStatusLastMonth", authentication() ,getMonthlyPaymentStats);
router.get("/sellersInfo", authentication() , getSellerAndProductStats);
router.get("/lastMonthSalesStats", authentication() ,getLastMonthSalesStats);
router.get("/sellersWithCategory", authentication() , acceptedSellers);
router.get("/latestSellers", authentication() , getLatestSellers);
router.get("/accepted/:vendorId", authentication(),getAcceptedVendorById);
router.get("/refused/:vendorId", authentication(), getRefusedVendorById);
router.get("/getSubOrdersByVendorId",authentication() ,getSubOrdersByVendorId );



export default router;
