import User from "../../DB/models/User.model.js";
import { OrderModelUser } from "../../DB/models/orderSchemaUser.model.js";
import { SubOrderModel } from "../../DB/models/subOrdersSchema.model.js";
import { ProductModellll } from "../../DB/models/productSchemaaaa.js";

export const getDashboardStatsService = async () => {
  const totalUsers = await User.countDocuments();
  const totalOrders = await OrderModelUser.countDocuments();
  const totalSubOrders = await SubOrderModel.countDocuments();
  const totalProducts = await ProductModellll.countDocuments();

  const revenueAgg = await OrderModelUser.aggregate([
    {
      $match: {
        paymentStatus: "paid", // optional but recommended
      },
    },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: "$totalAmount" }, // ✅ CORRECT FIELD
      },
    },
  ]);

  const totalRevenue =
    revenueAgg.length > 0 ? revenueAgg[0].totalRevenue : 0;
  
    const popularProducts = await OrderModelUser.aggregate([
      {
        $match: {
          paymentStatus: "paid",
        },
      },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.productId",
          totalSold: { $sum: "$items.quantity" },
          totalRevenue: { $sum: "$items.totalPrice" },
          productName: { $first: "$items.productName" },
        },
      },
      { $sort: { totalSold: -1 } },
      { $limit: 5 },
    ]);
    // per day========================================
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const todayOrders = await OrderModelUser.countDocuments({
      createdAt: { $gte: startOfToday, $lte: endOfToday },
    });
    const todayRevenueAgg = await OrderModelUser.aggregate([
      {
        $match: {
          paymentStatus: "paid",
          createdAt: { $gte: startOfToday, $lte: endOfToday },
        },
      },
      {
        $group: {
          _id: null,
          revenue: { $sum: "$totalAmount" },
        },
      },
    ]);
    
    const todayRevenue =
      todayRevenueAgg.length ? todayRevenueAgg[0].revenue : 0;
      const latestDaySalesAgg = await OrderModelUser.aggregate([
        {
          $match: {
            paymentStatus: "paid",
            createdAt: { $gte: startOfToday, $lte: endOfToday },
          },
        },
        {
          $group: {
            _id: null,
            totalSales: { $sum: "$totalAmount" },
            ordersCount: { $sum: 1 },
          },
        },
      ]);
      
      const latestDaySales = latestDaySalesAgg.length
        ? latestDaySalesAgg[0]
        : { totalSales: 0, ordersCount: 0 };
    // per month ==============================================
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
    const monthOrders = await OrderModelUser.countDocuments({
      createdAt: { $gte: startOfMonth, $lte: endOfMonth },
    });
    const monthRevenueAgg = await OrderModelUser.aggregate([
      {
        $match: {
          paymentStatus: "paid",
          createdAt: { $gte: startOfMonth, $lte: endOfMonth },
        },
      },
      {
        $group: {
          _id: null,
          revenue: { $sum: "$totalAmount" },
        },
      },
    ]);
    
    const monthRevenue =
      monthRevenueAgg.length ? monthRevenueAgg[0].revenue : 0;
      const latestMonthSalesAgg = await OrderModelUser.aggregate([
        {
          $match: {
            paymentStatus: "paid",
            createdAt: { $gte: startOfMonth, $lte: endOfMonth },
          },
        },
        {
          $group: {
            _id: null,
            totalSales: { $sum: "$totalAmount" },
            ordersCount: { $sum: 1 },
          },
        },
      ]);
      
      const latestMonthSales = latestMonthSalesAgg.length
        ? latestMonthSalesAgg[0]
        : { totalSales: 0, ordersCount: 0 };
  return {
    totalUsers,
    totalOrders,
    todayOrders,
    monthOrders,
    totalSubOrders,
    totalProducts,
    todayRevenue,
    monthRevenue,
    latestDaySales,
    latestMonthSales,
    totalRevenue: totalRevenue || 0,
    popularProducts
  };
};
