import User from "../../DB/models/User.model.js";
import { OrderModelUser } from "../../DB/models/orderSchemaUser.model.js";
import { SubOrderModel } from "../../DB/models/subOrdersSchema.model.js";
import { ProductModellll } from "../../DB/models/productSchemaaaa.js";
import { fillMissingDays } from "./helpers/fillMissingDays.js";
import mongoose from "mongoose";

// =================== NEW UNIFIED GRAPH DATA FUNCTIONS ===================

export const getAdminGraphDataService = async (period) => {
  const now = new Date();

  if (period === "monthly") {
    // Range: 1st of current month to Now
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const rawData = await OrderModelUser.aggregate([
      {
        $match: {
          status: "confirmed",
          createdAt: { $gte: startOfMonth, $lte: now },
        },
      },
      {
        $group: {
          _id: { $dayOfMonth: "$createdAt" },
          ordersCount: { $sum: 1 },
          revenue: { $sum: "$totalAmount.usd" },
        },
      },
    ]);

    // Map: Day -> Data
    const dataMap = new Map();
    rawData.forEach((item) => {
      dataMap.set(item._id, {
        ordersCount: item.ordersCount,
        revenue: item.revenue,
      });
    });

    const xAxis = [];
    const ordersCount = [];
    const revenue = [];
    const currentDay = now.getDate();

    // Loop 1 to 30
    for (let day = 1; day <= 30; day++) {
      xAxis.push(day); // Return number only

      if (day > currentDay) {
        // Future days in this month -> 0
        ordersCount.push(0);
        revenue.push(0);
      } else {
        // Past/Present days -> Actual or 0
        const data = dataMap.get(day);
        ordersCount.push(data?.ordersCount || 0);
        revenue.push(data?.revenue || 0);
      }
    }

    return {
      xAxis,
      yAxis: {
        ordersCount,
        revenue,
      },
    };
  } else if (period === "daily") {
    // Range: 00:00 Today to Now
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const rawData = await OrderModelUser.aggregate([
      {
        $match: {
          status: "confirmed",
          createdAt: { $gte: startOfDay, $lte: now },
        },
      },
      {
        $group: {
          _id: { $hour: "$createdAt" },
          ordersCount: { $sum: 1 },
          revenue: { $sum: "$totalAmount.usd" },
        },
      },
    ]);

    // Map: Hour -> Data
    const dataMap = new Map();
    rawData.forEach((item) => {
      dataMap.set(item._id, {
        ordersCount: item.ordersCount,
        revenue: item.revenue,
      });
    });

    const xAxis = [];
    const ordersCount = [];
    const revenue = [];
    const currentHour = now.getHours();

    // Loop 0 to 23
    for (let hour = 0; hour < 24; hour++) {
      xAxis.push(hour); // Return number only

      if (hour > currentHour) {
        // Future hours -> 0
        ordersCount.push(0);
        revenue.push(0);
      } else {
        // Past/Present hours -> Actual or 0
        const data = dataMap.get(hour);
        ordersCount.push(data?.ordersCount || 0);
        revenue.push(data?.revenue || 0);
      }
    }

    return {
      xAxis,
      yAxis: {
        ordersCount,
        revenue,
      },
    };
  }

  throw new Error("Invalid period");
};


export const getVendorGraphDataService = async (vendorId, period) => {
  const now = new Date();
  const vId = new mongoose.Types.ObjectId(vendorId);

  if (period === "monthly") {
    // Range: 1st of current month to Now
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const rawData = await SubOrderModel.aggregate([
      {
        $match: {
          vendorId: vId,
          status: "confirmed",
          createdAt: { $gte: startOfMonth, $lte: now },
        },
      },
      {
        $group: {
          _id: { $dayOfMonth: "$createdAt" },
          ordersCount: { $sum: 1 },
          revenue: { $sum: "$totalAmount.vendor" },
        },
      },
    ]);

    // Map: Day -> Data
    const dataMap = new Map();
    rawData.forEach((item) => {
      dataMap.set(item._id, {
        ordersCount: item.ordersCount,
        revenue: item.revenue,
      });
    });

    const xAxis = [];
    const ordersCount = [];
    const revenue = [];
    const currentDay = now.getDate();

    // Loop 1 to 30
    for (let day = 1; day <= 30; day++) {
      xAxis.push(day); // Return number only

      if (day > currentDay) {
        // Future days -> 0
        ordersCount.push(0);
        revenue.push(0);
      } else {
        // Past/Present days -> Actual or 0
        const data = dataMap.get(day);
        ordersCount.push(data?.ordersCount || 0);
        revenue.push(data?.revenue || 0);
      }
    }

    return {
      xAxis,
      yAxis: {
        ordersCount,
        revenue,
      },
    };
  } else if (period === "daily") {
    // Range: 00:00 Today to Now
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const rawData = await SubOrderModel.aggregate([
      {
        $match: {
          vendorId: vId,
          status: "confirmed",
          createdAt: { $gte: startOfDay, $lte: now },
        },
      },
      {
        $group: {
          _id: { $hour: "$createdAt" },
          ordersCount: { $sum: 1 },
          revenue: { $sum: "$totalAmount.vendor" },
        },
      },
    ]);

    // Map: Hour -> Data
    const dataMap = new Map();
    rawData.forEach((item) => {
      dataMap.set(item._id, {
        ordersCount: item.ordersCount,
        revenue: item.revenue,
      });
    });

    const xAxis = [];
    const ordersCount = [];
    const revenue = [];
    const currentHour = now.getHours();

    // Loop 0 to 23
    for (let hour = 0; hour < 24; hour++) {
      xAxis.push(hour); // Return number only

      if (hour > currentHour) {
        // Future hours -> 0
        ordersCount.push(0);
        revenue.push(0);
      } else {
        // Past/Present hours -> Actual or 0
        const data = dataMap.get(hour);
        ordersCount.push(data?.ordersCount || 0);
        revenue.push(data?.revenue || 0);
      }
    }

    return {
      xAxis,
      yAxis: {
        ordersCount,
        revenue,
      },
    };
  }

  throw new Error("Invalid period");
};

// =================== EXISTING FUNCTIONS (kept for backward compatibility) ===================

export const getDashboardStatsService = async (user, lang = "en") => {
  if (!user || user.accountType !== "Admin") {
    throw new Error("Only admin can get dashboard stats");
  }

  const now = new Date();

  // Start of Day (12:00 AM)
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  // Start of Month (1st)
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // 🔹 Match criteria: Paid OR Confirmed (for COD)
  const validOrdersQuery = {
    status: "confirmed",
  };

  // ================= PARALLEL QUERIES =================
  const [
    totalUsersAgg,
    totalOrders,
    totalProducts,
    revenueAgg,
    todayAgg,
    monthAgg,
    popularProducts,
  ] = await Promise.all([
    // 1. Total Users (Unique customers with confirmed/paid orders)
    OrderModelUser.aggregate([
      { $match: validOrdersQuery },
      { $group: { _id: "$customerId" } },
      { $count: "count" },
    ]),

    // 2. Total Orders (Confirmed/Paid)
    OrderModelUser.countDocuments(validOrdersQuery),

    // 3. Total Products (Active)
    ProductModellll.countDocuments(),

    // 4. Total Revenue Base (Sum of USD)
    OrderModelUser.aggregate([
      { $match: validOrdersQuery },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$totalAmount.usd" },
        },
      },
    ]),

    // 5. Latest Day Sales (Today 12 AM onwards)
    OrderModelUser.aggregate([
      {
        $match: {
          ...validOrdersQuery,
          createdAt: { $gte: startOfToday },
        },
      },
      {
        $group: {
          _id: null,
          totalSales: { $sum: "$totalAmount.usd" },
          ordersCount: { $sum: 1 },
        },
      },
    ]),

    // 6. Latest Month Sales (1st of month onwards)
    OrderModelUser.aggregate([
      {
        $match: {
          ...validOrdersQuery,
          createdAt: { $gte: startOfMonth },
        },
      },
      {
        $group: {
          _id: null,
          totalSales: { $sum: "$totalAmount.usd" },
          ordersCount: { $sum: 1 },
        },
      },
    ]),

    // 7. Popular Products
    OrderModelUser.aggregate([
      { $match: validOrdersQuery },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.product._id",
          totalSold: { $sum: "$items.quantity" },
          totalRevenue: { $sum: "$items.totalPrice.usd" }, // Using USD for consistency
          productName: { $first: `$items.product.name.${lang}` }, // Localized name
          productImages: { $first: "$items.product.images" },
        },
      },
      { $sort: { totalSold: -1 } },
      { $limit: 5 },
    ]),
  ]);

  // ================= PROCESS RESULTS =================
  const totalUsers = totalUsersAgg[0]?.count || 0;
  
  // Total Revenue = 5% of total confirmed orders USD amount
  const totalRevenueUSD = revenueAgg[0]?.totalAmount || 0;
  const totalRevenue = Number((totalRevenueUSD * 0.05).toFixed(2));

  const latestDaySales = todayAgg[0]
    ? {
        totalSales: todayAgg[0].totalSales,
        ordersCount: todayAgg[0].ordersCount,
      }
    : { totalSales: 0, ordersCount: 0 };

  const latestMonthSales = monthAgg[0]
    ? {
        totalSales: monthAgg[0].totalSales,
        ordersCount: monthAgg[0].ordersCount,
      }
    : { totalSales: 0, ordersCount: 0 };

  return {
    // Requested Values
    totalUsers,
    totalOrders,
    totalProducts,
    totalRevenue,
    latestDaySales,
    latestMonthSales,
    popularProducts,
  };
};

// //==================================
// export const getMonthlyDailySalesService = async () => {
//   const now = new Date();

//   const startOfMonth = new Date(
//     now.getFullYear(),
//     now.getMonth(),
//     1,
//     0,
//     0,
//     0,
//     0
//   );

//   const endOfToday = new Date();
//   endOfToday.setHours(23, 59, 59, 999);

//   const aggData = await OrderModelUser.aggregate([
//     {
//       $match: {
//         paymentStatus: "paid",
//         // createdAt: { $gte: startOfMonth, $lte: endOfToday },
//       },
//     },
//     {
//       $group: {
//         _id: { $dayOfMonth: "$createdAt" },
//         val: { $sum: "$totalAmount.usd" },
//         users: { $addToSet: "$customerId" },
//       },
//     },
//     {
//       $project: {
//         _id: 0,
//         day: "$_id",
//         val: 1,
//         users: { $size: "$users" },
//       },
//     },
//   ]);

//   // 🔽 fill missing days
//   return fillMissingDays(aggData, now.getDate());
// };
// //======================
// export const getMaxDailySalesService = async () => {
//   const startOfMonth = new Date(
//     new Date().getFullYear(),
//     new Date().getMonth(),
//     1
//   );

//   const endOfToday = new Date();
//   endOfToday.setHours(23, 59, 59, 999);

//   const result = await OrderModelUser.aggregate([
//     {
//       $match: {
//         paymentStatus: "paid",
//         createdAt: { $gte: startOfMonth, $lte: endOfToday },
//       },
//     },

//     // 1️⃣ group by day
//     {
//       $group: {
//         _id: { $dayOfMonth: "$createdAt" },
//         val: { $sum: "$totalAmount.usd" },
//       },
//     },

//     // 2️⃣ get max daily sum
//     {
//       $group: {
//         _id: null,
//         averageMonthly: { $max: "$val" },
//       },
//     },
//   ]);
//   // let res =
//   // const ob={}
//   // result.push(4000);
//   // console.log(result[0].maxDailySales);
//   return result.length
//     ? [
//         result[0].averageMonthly,
//         Math.floor(result[0].averageMonthly - result[0].averageMonthly / 4),
//         Math.floor(result[0].averageMonthly - result[0].averageMonthly / 2),
//         Math.floor(result[0].averageMonthly / 4),
//       ]
//     : [0, 0, 0, 0];
// };
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
// export const getMaxDailySalesServiceV = async (vendorId) => {
//   const startOfMonth = new Date(
//     new Date().getFullYear(),
//     new Date().getMonth(),
//     1
//   );

//   const endOfToday = new Date();
//   endOfToday.setHours(23, 59, 59, 999);

//   const result = await OrderModelUser.aggregate([
//     { $unwind: "$items" },
//     {
//       $match: {
//         paymentStatus: "paid",
//         "items.vendorId": new mongoose.Types.ObjectId(vendorId),
//         createdAt: { $gte: startOfMonth, $lte: endOfToday },
//       },
//     },
//     {
//       $group: {
//         _id: { $dayOfMonth: "$createdAt" },
//         val: { $sum: "$items.totalPrice.vendor" },
//       },
//     },
//     {
//       $group: {
//         _id: null,
//         maxDailySales: { $max: "$val" },
//       },
//     },
//   ]);

//   if (!result.length) return [0, 0, 0, 0];

//   const max = result[0].maxDailySales;

//   return [
//     max,
//     Math.floor(max - max / 4),
//     Math.floor(max - max / 2),
//     Math.floor(max / 4),
//   ];
// };

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
