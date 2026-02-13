import mongoose from "mongoose";
import User from "../../../DB/models/User.model.js";
import { OrderModelUser } from "../../../DB/models/orderSchemaUser.model.js";
import { SubOrderModel } from "../../../DB/models/subOrdersSchema.model.js";
import { ProductModellll } from "../../../DB/models/productSchemaaaa.js";
import { transformSubOrderResponse } from "../helpers/response.helpers.js";

export const getCustomersForVendorService = async (vendorId) => {
    if (!vendorId) {
      throw new Error("Vendor ID is required");
    }
  
    const customers = await SubOrderModel.aggregate([
      {
        $match: {
          vendorId,
          // Optional filters:
          // paymentStatus: "paid",
        },
      },
      {
        $lookup: {
          from: "orderusers", // Order collection
          localField: "orderId",
          foreignField: "_id",
          as: "order",
        },
      },
      {
        $unwind: "$order",
      },
      {
        $lookup: {
          from: "users", // Users collection
          localField: "order.customerId",
          foreignField: "_id",
          as: "customer",
        },
      },
      {
        $unwind: "$customer",
      },
      {
        $group: {
          _id: "$customer._id",
          fullName: { $first: "$customer.fullName" },
          email: { $first: "$customer.email" },
          phone: { $first: "$customer.phone" },   // ✅ added
          country: { $first: "$customer.country" },
          numSubOrders: { $sum: 1 },
          totalSpent: { $sum: "$totalAmount.vendor" }, // ✅ Use vendor price
        },
      },
      {
        $project: {
          _id: 0,
          customerId: "$_id",
          fullName: 1,
          email: 1,
          country: 1,
          phone: 1,
          numSubOrders: 1,
          totalSpent: 1,
        },
      },
      {
        $sort: { totalSpent: -1 },
      },
    ]);
  
    return customers;
  };
//=========================================
export const getVendorStatsByDateRangeService = async (
    vendorId,
    startDate,
    endDate
  ) => {
    if (!vendorId) {
      throw new Error("Vendor ID is required");
    }
  
    const stats = await SubOrderModel.aggregate([
      {
        $match: {
          vendorId,
          paymentStatus: "paid",
          createdAt: {
            $gte: startDate,
            $lte: endDate,
          },
        },
      },
      {
        $group: {
          _id: null,
          totalSales: { $sum: "$totalAmount.vendor" }, // ✅ Use vendor price
          totalOrders: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          totalSales: 1,
          totalOrders: 1,
        },
      },
    ]);
  
    return (
      stats[0] || {
        totalSales: 0,
        totalOrders: 0,
      }
    );
  };
  //===============================
  export const getSubOrdersByVendorIdService = async (vendorId, query, lang = "en") => {
    if (!vendorId) {
      throw new Error("Vendor ID is required");
    }
  
    const {
      paymentStatus,
      shippingStatus,
      fromDate,
      page = 1,
      limit = 10,
    } = query;
  
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;
  
    // 🔹 Build dynamic filter - ensure vendorId is ObjectId
    const filter = { 
      vendorId: mongoose.Types.ObjectId.isValid(vendorId) 
        ? new mongoose.Types.ObjectId(vendorId) 
        : vendorId 
    };
  
    if (paymentStatus) {
      filter.paymentStatus = paymentStatus;
    }
  
    if (shippingStatus) {
      filter.shippingStatus = shippingStatus;
    }
  
    if (fromDate) {
      filter.createdAt = {
        $gte: new Date(fromDate),
      };
    }
  
    // 🔹 Fetch suborders + count
    // Note: items contain embedded product/variant objects, not references
    const [subOrders, total] = await Promise.all([
      SubOrderModel.find(filter)
        .populate("orderId", "orderNumber createdAt paymentStatus shippingStatus")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
  
      SubOrderModel.countDocuments(filter),
    ]);
  
    // ✅ Transform suborders with localization and VENDOR pricing
    const formattedSubOrders = subOrders.map((subOrder) =>
      transformSubOrderResponse(subOrder, lang, "vendor")
    );
  
    return {
      count: formattedSubOrders.length,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalItems: total,
        itemsPerPage: limitNum,
      },
      data: formattedSubOrders,
    };
  };
  //==============================
  export const getVendorOverallStatsService = async (vendorId) => {
    if (!vendorId) throw new Error("Vendor ID is required");
  
    const stats = await SubOrderModel.aggregate([
      {
        $match: {
          vendorId,
          paymentStatus: "paid",
        },
      },
      {
        $unwind: "$items", // flatten items array to count products
      },
      {
        $group: {
          _id: "$vendorId",
          numCustomers: { $addToSet: "$orderId" }, // we will count unique customers later
          numProducts: { $sum: "$items.quantity" },
          totalSales: { $sum: 1 }, // total suborders
          totalRevenue: { $sum: "$totalAmount.vendor" }, // ✅ Use vendor price
        },
      },
      {
        $lookup: {
          from: "orderusers", // Order collection
          localField: "_id",
          foreignField: "_id",
          as: "orders",
        },
      },
      {
        $project: {
          _id: 0,
          numCustomers: { $size: "$numCustomers" },
          numProducts: 1,
          totalSales: 1,
          totalRevenue: 1,
        },
      },
    ]);
  
    return stats[0] || {
      numCustomers: 0,
      numProducts: 0,
      totalSales: 0,
      totalRevenue: 0,
    };
  };
  //============================
  export const getVendorDashboardStatsService = async (user) => {
    if (!user || user.accountType !== "vendor") {
      throw new Error("Only vendor can get dashboard stats");
    }
  
    const vendorId = user._id;
  
    // ================= TOTAL COUNTS =================
    const totalSubOrders = await SubOrderModel.countDocuments({ vendorId });
  
    const totalProducts = await ProductModellll.countDocuments({
      createdBy: vendorId,
    });
  
    // ================= TOTAL REVENUE (VENDOR PRICE) =================
    const revenueAgg = await SubOrderModel.aggregate([
      {
        $match: {
          vendorId,
          paymentStatus: "paid",
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$totalAmount.vendor" }, // ✅ Use vendor price
        },
      },
    ]);
  
    const totalRevenue = revenueAgg.length ? revenueAgg[0].totalRevenue : 0;
  
    // ================= POPULAR PRODUCTS (VENDOR PRICE) =================
    const popularProducts = await SubOrderModel.aggregate([
      {
        $match: {
          vendorId,
          paymentStatus: "paid",
        },
      },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.product._id",
          totalSold: { $sum: "$items.quantity" },
          totalRevenue: { $sum: "$items.totalPrice.vendor" }, // ✅ Use vendor price
          productName: { $first: "$items.product.name" },
        },
      },
      { $sort: { totalSold: -1 } },
      { $limit: 5 },
    ]);
  
    // ================= TODAY STATS =================
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
  
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
  
    const todayOrders = await SubOrderModel.countDocuments({
      vendorId,
      createdAt: { $gte: startOfToday, $lte: endOfToday },
    });
  
    const todaySalesAgg = await SubOrderModel.aggregate([
      {
        $match: {
          vendorId,
          paymentStatus: "paid",
          createdAt: { $gte: startOfToday, $lte: endOfToday },
        },
      },
      {
        $group: {
          _id: null,
          totalSales: { $sum: "$totalAmount.vendor" }, // ✅ Use vendor price
          ordersCount: { $sum: 1 },
        },
      },
    ]);
  
    const latestDaySales = todaySalesAgg.length
      ? todaySalesAgg[0]
      : { totalSales: 0, ordersCount: 0 };
  
    // ================= MONTH STATS =================
    const startOfMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1
    );
  
    const endOfMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth() + 1,
      0,
      23,
      59,
      59,
      999
    );
  
    const monthOrders = await SubOrderModel.countDocuments({
      vendorId,
      createdAt: { $gte: startOfMonth, $lte: endOfMonth },
    });
  
    const monthSalesAgg = await SubOrderModel.aggregate([
      {
        $match: {
          vendorId,
          paymentStatus: "paid",
          createdAt: { $gte: startOfMonth, $lte: endOfMonth },
        },
      },
      {
        $group: {
          _id: null,
          totalSales: { $sum: "$totalAmount.vendor" }, // ✅ Use vendor price
          ordersCount: { $sum: 1 },
        },
      },
    ]);
  
    const latestMonthSales = monthSalesAgg.length
      ? monthSalesAgg[0]
      : { totalSales: 0, ordersCount: 0 };
  
    // ================= RETURN =================
    return {
      totalSubOrders,
      totalProducts,
      todayOrders,
      monthOrders,
      totalRevenue,
      latestDaySales,
      latestMonthSales,
      popularProducts,
    };
  };