import User from "../../DB/models/User.model.js";
import { OrderModelUser } from "../../DB/models/orderSchemaUser.model.js";
import { SubOrderModel } from "../../DB/models/subOrdersSchema.model.js";
import { ProductModellll } from "../../DB/models/productSchemaaaa.js";
import { fillMissingDays } from "./helpers/fillMissingDays.js";
import mongoose from "mongoose";

export const getDashboardStatsService = async (user) => {
  if (!user || user.accountType !== "Admin") {
    throw new Error("Only admin can get dashboard stats");
  }

  const now = new Date();

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const endOfMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
    999
  );

  // ================= BASIC COUNTS =================
  const [
    totalUsers,
    totalOrders,
    totalSubOrders,
    totalProducts,
    todayOrders,
    monthOrders,
  ] = await Promise.all([
    User.countDocuments(),
    OrderModelUser.countDocuments(),
    SubOrderModel.countDocuments(),
    ProductModellll.countDocuments(),
    OrderModelUser.countDocuments({
      createdAt: { $gte: startOfToday, $lte: endOfToday },
    }),
    OrderModelUser.countDocuments({
      createdAt: { $gte: startOfMonth, $lte: endOfMonth },
    }),
  ]);

  // ================= TOTAL REVENUE =================
  const revenueAgg = await OrderModelUser.aggregate([
    { $match: { paymentStatus: "paid" } },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: "$totalAmount.customer" },
      },
    },
  ]);

  const totalRevenue = revenueAgg[0]?.totalRevenue || 0;

  // ================= POPULAR PRODUCTS =================
  const popularProducts = await OrderModelUser.aggregate([
    { $match: { paymentStatus: "paid" } },
    { $unwind: "$items" },
    {
      $group: {
        _id: "$items.product._id",
        totalSold: { $sum: "$items.quantity" },
        totalRevenue: { $sum: "$items.totalPrice.customer" },
        productName: { $first: "$items.product.name.en" },
        productImages: { $first: "$items.product.images" },
      },
    },
    { $sort: { totalSold: -1 } },
    { $limit: 5 },
  ]);

  // ================= TODAY REVENUE =================
  const todayAgg = await OrderModelUser.aggregate([
    {
      $match: {
        paymentStatus: "paid",
        createdAt: { $gte: startOfToday, $lte: endOfToday },
      },
    },
    {
      $group: {
        _id: null,
        totalSales: { $sum: "$totalAmount.customer" },
        ordersCount: { $sum: 1 },
      },
    },
  ]);

  const latestDaySales = todayAgg[0] || {
    totalSales: 0,
    ordersCount: 0,
  };

  const todayRevenue = latestDaySales.totalSales;

  // ================= MONTH REVENUE =================
  const monthAgg = await OrderModelUser.aggregate([
    {
      $match: {
        paymentStatus: "paid",
        createdAt: { $gte: startOfMonth, $lte: endOfMonth },
      },
    },
    {
      $group: {
        _id: null,
        totalSales: { $sum: "$totalAmount.customer" },
        ordersCount: { $sum: 1 },
      },
    },
  ]);

  const latestMonthSales = monthAgg[0] || {
    totalSales: 0,
    ordersCount: 0,
  };

  const monthRevenue = latestMonthSales.totalSales;

  return {
    totalUsers,
    totalOrders,
    totalSubOrders,
    totalProducts,

    totalRevenue,

    todayOrders,
    todayRevenue,
    latestDaySales,

    monthOrders,
    monthRevenue,
    latestMonthSales,

    popularProducts,
  };
};

//==================================
export const getMonthlyDailySalesService = async () => {
  const now = new Date();

  const startOfMonth = new Date(
    now.getFullYear(),
    now.getMonth(),
    1,
    0,
    0,
    0,
    0
  );

  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const aggData = await OrderModelUser.aggregate([
    {
      $match: {
        paymentStatus: "paid",
        // createdAt: { $gte: startOfMonth, $lte: endOfToday },
      },
    },
    {
      $group: {
        _id: { $dayOfMonth: "$createdAt" },
        val: { $sum: "$totalAmount.usd" },
        users: { $addToSet: "$customerId" },
      },
    },
    {
      $project: {
        _id: 0,
        day: "$_id",
        val: 1,
        users: { $size: "$users" },
      },
    },
  ]);

  // 🔽 fill missing days
  return fillMissingDays(aggData, now.getDate());
};
//======================
export const getMaxDailySalesService = async () => {
  const startOfMonth = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1
  );

  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const result = await OrderModelUser.aggregate([
    {
      $match: {
        paymentStatus: "paid",
        createdAt: { $gte: startOfMonth, $lte: endOfToday },
      },
    },

    // 1️⃣ group by day
    {
      $group: {
        _id: { $dayOfMonth: "$createdAt" },
        val: { $sum: "$totalAmount.usd" },
      },
    },

    // 2️⃣ get max daily sum
    {
      $group: {
        _id: null,
        averageMonthly: { $max: "$val" },
      },
    },
  ]);
  // let res =
  // const ob={}
  // result.push(4000);
  // console.log(result[0].maxDailySales);
  return result.length
    ? [
        result[0].averageMonthly,
        Math.floor(result[0].averageMonthly - result[0].averageMonthly / 4),
        Math.floor(result[0].averageMonthly - result[0].averageMonthly / 2),
        Math.floor(result[0].averageMonthly / 4),
      ]
    : [0, 0, 0, 0];
};
//======================
export const getTodayHourlyStatsService = async () => {
  const now = new Date();

  // Start today at 1 AM (UTC-safe)
  const startOfDay = new Date();
  startOfDay.setUTCHours(1, 0, 0, 0);

  const rawData = await OrderModelUser.aggregate([
    {
      $match: {
        paymentStatus: "paid",
        createdAt: {
          $gte: startOfDay,
          $lte: now,
        },
      },
    },
    {
      $group: {
        _id: { $hour: "$createdAt" },
        totalSales: { $sum: "$totalAmount.usd" },
        users: { $addToSet: "$customerId" },
      },
    },
    {
      $project: {
        hour: "$_id",
        totalSales: 1,
        totalUsers: { $size: "$users" },
        _id: 0,
      },
    },
  ]);

  // 🔹 Always fill hours
  const currentHour = now.getUTCHours();
  const map = new Map(rawData.map((d) => [d.hour, d]));

  const result = [];
  for (let h = 1; h <= currentHour; h++) {
    result.push({
      hour: h,
      totalUsers: map.get(h)?.totalUsers || 0,
      totalSales: map.get(h)?.totalSales || 0,
    });
  }

  return result;
};
//===========================
export const getMaxHourSalesService = async () => {
  const now = new Date();

  // Start today at 1 AM UTC
  const startOfDay = new Date();
  startOfDay.setUTCHours(1, 0, 0, 0);

  const result = await OrderModelUser.aggregate([
    {
      $match: {
        paymentStatus: { $in: ["paid", "cash_on_delivery"] },
        createdAt: { $gte: startOfDay, $lte: now },
      },
    },
    {
      $group: {
        _id: { $hour: "$createdAt" },
        totalSales: { $sum: "$totalAmount.usd" },
        users: { $addToSet: "$customerId" },
      },
    },
    {
      $project: {
        hour: "$_id",
        totalSales: 1,
        totalUsers: { $size: "$users" },
        _id: 0,
      },
    },
    {
      $sort: { totalSales: -1 }, // sort descending
    },
    { $limit: 1 }, // only max
  ]);

  // If no data, return default
  if (result.length === 0) {
    return [0, 0, 0, 0];
  }

  return [
    result[0].totalSales,
    Math.floor(result[0].totalSales - result[0].totalSales / 4),
    Math.floor(result[0].totalSales - result[0].totalSales / 2),
    Math.floor(result[0].totalSales / 4),
  ]; // max hour
};
//=================================================
// =================== Monthly Daily Sales for Vendor ===================
export const getMonthlyDailySalesServiceV = async (vendorId) => {
  const now = new Date();

  const startOfMonth = new Date(
    now.getFullYear(),
    now.getMonth(),
    1,
    0,
    0,
    0,
    0
  );

  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const aggData = await OrderModelUser.aggregate([
    {
      $match: {
        paymentStatus: "paid",
        "items.vendorId": new mongoose.Types.ObjectId(vendorId),
        createdAt: { $gte: startOfMonth, $lte: endOfToday },
      },
    },
    { $unwind: "$items" },
    {
      $match: { "items.vendorId": new mongoose.Types.ObjectId(vendorId) },
    },
    {
      $group: {
        _id: { $dayOfMonth: "$createdAt" },
        val: { $sum: "$items.totalPrice.vendor" },
        users: { $addToSet: "$customerId" },
      },
    },
    {
      $project: {
        _id: 0,
        day: "$_id",
        val: 1,
        users: { $size: "$users" },
      },
    },
  ]);

  return fillMissingDays(aggData, now.getDate());
};

// =================== Max Daily Sales for Vendor ===================
export const getMaxDailySalesServiceV = async (vendorId) => {
  const startOfMonth = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1
  );

  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const result = await OrderModelUser.aggregate([
    { $unwind: "$items" },
    {
      $match: {
        paymentStatus: "paid",
        "items.vendorId": new mongoose.Types.ObjectId(vendorId),
        createdAt: { $gte: startOfMonth, $lte: endOfToday },
      },
    },
    {
      $group: {
        _id: { $dayOfMonth: "$createdAt" },
        val: { $sum: "$items.totalPrice.vendor" },
      },
    },
    {
      $group: {
        _id: null,
        maxDailySales: { $max: "$val" },
      },
    },
  ]);

  if (!result.length) return [0, 0, 0, 0];

  const max = result[0].maxDailySales;

  return [
    max,
    Math.floor(max - max / 4),
    Math.floor(max - max / 2),
    Math.floor(max / 4),
  ];
};

// =================== Today Hourly Stats for Vendor ===================
export const getTodayHourlyStatsServiceV = async (vendorId) => {
  const now = new Date();
  const startOfDay = new Date();
  startOfDay.setUTCHours(1, 0, 0, 0);

  const rawData = await OrderModelUser.aggregate([
    { $unwind: "$items" },
    {
      $match: {
        paymentStatus: "paid",
        "items.vendorId": new mongoose.Types.ObjectId(vendorId),
        createdAt: { $gte: startOfDay, $lte: now },
      },
    },
    {
      $group: {
        _id: { $hour: "$createdAt" },
        totalSales: { $sum: "$items.totalPrice.vendor" },
        users: { $addToSet: "$customerId" },
      },
    },
    {
      $project: {
        hour: "$_id",
        totalSales: 1,
        totalUsers: { $size: "$users" },
        _id: 0,
      },
    },
  ]);

  const currentHour = now.getUTCHours();
  const map = new Map(rawData.map((d) => [d.hour, d]));

  const result = [];
  for (let h = 1; h <= currentHour; h++) {
    result.push({
      hour: h,
      totalUsers: map.get(h)?.totalUsers || 0,
      totalSales: map.get(h)?.totalSales || 0,
    });
  }

  return result;
};

// =================== Max Hourly Sales for Vendor ===================
export const getMaxHourSalesServiceV = async (vendorId) => {
  const now = new Date();
  const startOfDay = new Date();
  startOfDay.setUTCHours(1, 0, 0, 0);

  const result = await OrderModelUser.aggregate([
    { $unwind: "$items" },
    {
      $match: {
        paymentStatus: { $in: ["paid", "cash_on_delivery"] },
        "items.vendorId": new mongoose.Types.ObjectId(vendorId),
        createdAt: { $gte: startOfDay, $lte: now },
      },
    },
    {
      $group: {
        _id: { $hour: "$createdAt" },
        totalSales: { $sum: "$items.totalPrice.vendor" },
        users: { $addToSet: "$customerId" },
      },
    },
    { $sort: { totalSales: -1 } },
    { $limit: 1 },
  ]);

  if (!result.length) return [0, 0, 0, 0];

  const max = result[0].totalSales;

  return [
    max,
    Math.floor(max - max / 4),
    Math.floor(max - max / 2),
    Math.floor(max / 4),
  ];
};
