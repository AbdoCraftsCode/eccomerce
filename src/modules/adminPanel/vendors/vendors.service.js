import User from "../../../DB/models/User.model.js";
import { OrderModelUser } from "../../../DB/models/orderSchemaUser.model.js";
import { SubOrderModel } from "../../../DB/models/subOrdersSchema.model.js";
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
          totalSpent: { $sum: "$totalAmount" },
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
          totalSales: { $sum: "$totalAmount" },
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
  export const getSubOrdersByVendorIdService = async (vendorId, query) => {
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
  
    // 🔹 Build dynamic filter
    const filter = { vendorId };
  
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
    const [subOrders, total] = await Promise.all([
      SubOrderModel.find(filter)
        .populate("orderId", "orderNumber createdAt paymentStatus shippingStatus")
        .populate({
          path: "items.productId", // nested populate inside items array
          select: "name mainPrice",
          model: "Producttttt",
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
  
      SubOrderModel.countDocuments(filter),
    ]);
  
    return {
      count: subOrders.length,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalItems: total,
        itemsPerPage: limitNum,
      },
      data: subOrders,
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
          totalRevenue: { $sum: "$totalAmount" },
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