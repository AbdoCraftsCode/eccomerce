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
    // NOTE: items are excluded here to keep the listing minimal as requested
    const [subOrders, total] = await Promise.all([
      SubOrderModel.find(filter)
        .populate("orderId", "orderNumber createdAt paymentStatus shippingStatus")
        .select("-items") // Exclude items for minimal listing
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
  
      SubOrderModel.countDocuments(filter),
    ]);
  
    // ✅ Transform suborders with localization and VENDOR pricing
    const formattedSubOrders = subOrders.map((subOrder) =>
      transformSubOrderResponse(subOrder, lang, "vendor", { showCoupon: false })
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

  export const getSubOrderDetailsByVendorIdService = async (subOrderId, vendorId, lang = "en") => {
    if (!subOrderId || !vendorId) {
      throw new Error("Suborder ID and Vendor ID are required");
    }

    const subOrder = await SubOrderModel.findOne({
      _id: subOrderId,
      vendorId: mongoose.Types.ObjectId.isValid(vendorId) 
        ? new mongoose.Types.ObjectId(vendorId) 
        : vendorId
    })
      .populate("orderId", "orderNumber createdAt paymentStatus shippingStatus")
      .lean();

    if (!subOrder) {
      return null;
    }

    // ✅ Transform suborder with full details (including items) and VENDOR pricing
    return transformSubOrderResponse(subOrder, lang, "vendor");
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
  export const getVendorDashboardStatsService = async (user, lang = "en") => {
  if (!user || user.accountType !== "vendor") {
    throw new Error("Only vendor can get dashboard stats");
  }

  const vendorId = user._id;

  const now = new Date();

  // Start of Day (12:00 AM)
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  // Start of Month (1st)
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // 🔹 Match criteria: Paid OR Confirmed (for COD) + Vendor ID
  const validSubOrdersQuery = {
    vendorId,
    status: "confirmed",
  };

  // ================= PARALLEL QUERIES =================
  const [
    totalUsersAgg,
    totalOrders,
    totalProducts, // Total active products for this vendor
    revenueAgg,
    todayAgg,
    monthAgg,
    popularProducts,
  ] = await Promise.all([
    // 1. Total Users (Unique customers with confirmed/paid suborders)
    SubOrderModel.aggregate([
      { $match: validSubOrdersQuery },
      // Lookup order to get customerId
      {
        $lookup: {
          from: "orderusers", // Collection name
          localField: "orderId",
          foreignField: "_id",
          as: "order",
        },
      },
      { $unwind: "$order" },
      { $group: { _id: "$order.customerId" } },
      { $count: "count" },
    ]),

    // 2. Total Orders (Confirmed/Paid SubOrders)
    SubOrderModel.countDocuments(validSubOrdersQuery),

    // 3. Total Products (Active, created by vendor)
    ProductModellll.countDocuments({ createdBy: vendorId }),

    // 4. Total Revenue Base (Sum of Vendor Currency)
    SubOrderModel.aggregate([
      { $match: validSubOrdersQuery },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$totalAmount.vendor" },
        },
      },
    ]),

    // 5. Latest Day Sales (Today 12 AM onwards)
    SubOrderModel.aggregate([
      {
        $match: {
          ...validSubOrdersQuery,
          createdAt: { $gte: startOfToday },
        },
      },
      {
        $group: {
          _id: null,
          totalSales: { $sum: "$totalAmount.vendor" },
          ordersCount: { $sum: 1 },
        },
      },
    ]),

    // 6. Latest Month Sales (1st of month onwards)
    SubOrderModel.aggregate([
      {
        $match: {
          ...validSubOrdersQuery,
          createdAt: { $gte: startOfMonth },
        },
      },
      {
        $group: {
          _id: null,
          totalSales: { $sum: "$totalAmount.vendor" },
          ordersCount: { $sum: 1 },
        },
      },
    ]),

    // 7. Popular Products
    SubOrderModel.aggregate([
      { $match: validSubOrdersQuery },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.product._id",
          totalSold: { $sum: "$items.quantity" },
          totalRevenue: { $sum: "$items.totalPrice.vendor" }, // Vendor pricing
          productName: { $first: `$items.product.name.${lang}` }, 
          productImages: { $first: "$items.product.images" }, // Added images
        },
      },
      { $sort: { totalSold: -1 } },
      { $limit: 5 },
    ]),
  ]);

  // ================= PROCESS RESULTS =================
  const totalUsers = totalUsersAgg[0]?.count || 0;
  
  // Total Revenue = 95% of total confirmed suborders Vendor amount (5% admin fee deducted)
  const totalRevenueVendor = revenueAgg[0]?.totalAmount || 0;
  const totalRevenue = Number((totalRevenueVendor * 0.95).toFixed(2));

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
    totalUsers,
    totalOrders,
    totalProducts,   
    totalRevenue,
    latestDaySales,
    latestMonthSales,
    popularProducts,
  };
};
