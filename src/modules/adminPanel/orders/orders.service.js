import mongoose from "mongoose";
import { ObjectId } from "mongodb";
import User from "../../../DB/models/User.model.js";
import { OrderModelUser } from "../../../DB/models/orderSchemaUser.model.js";
import { SubOrderModel } from "../../../DB/models/subOrdersSchema.model.js";

export const getAllCustomersService = async () => {
  return await User.aggregate([
    // 1️⃣ Customers only
    {
      $match: {
        accountType: { $nin: ["Admin", "Owner", "vendor"] },
      },
    },

    // 2️⃣ Join orders
    {
      $lookup: {
        from: "orderusers", // ⚠️ collection name (lowercase + plural)
        localField: "_id",
        foreignField: "customerId",
        as: "orders",
      },
    },

    // 3️⃣ Calculate stats
    {
      $addFields: {
        totalOrders: {
          $size: {
            $filter: {
              input: "$orders",
              as: "order",
              cond: { $eq: ["$$order.paymentStatus", "paid"] },
            },
          },
        },
        totalSpent: {
          $sum: {
            $map: {
              input: {
                $filter: {
                  input: "$orders",
                  as: "order",
                  cond: { $eq: ["$$order.paymentStatus", "paid"] },
                },
              },
              as: "order",
              in: "$$order.totalAmount",
            },
          },
        },
      },
    },

    // 4️⃣ Clean response
    {
      $project: {
        password: 0,
        __v: 0,
        orders: 0,
      },
    },

    // 5️⃣ Sort by highest spenders
    {
      $sort: { totalSpent: -1 },
    },
  ]);
};
//---------------------------------------------------------------------------------------------
export const getAllOrdersService = async (query) => {
  const {
    paymentStatus,
    shippingStatus,
    fromDate,
    toDate,
    page = 1,
    limit = 10,
    currency = "customer", // 👈 new (customer | vendor | usd)
  } = query;

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const skip = (pageNum - 1) * limitNum;

  // 🔹 Dynamic filter
  const filter = {};

  if (paymentStatus) {
    filter.paymentStatus = paymentStatus;
  }

  if (shippingStatus) {
    filter.shippingStatus = shippingStatus;
  }

  if (fromDate || toDate) {
    filter.createdAt = {};

    if (fromDate) {
      filter.createdAt.$gte = new Date(fromDate);
    }

    if (toDate) {
      const endDate = new Date(toDate);
      endDate.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = endDate;
    }
  }

  // 🔹 Fetch orders + total count
  const [orders, total] = await Promise.all([
    OrderModelUser.find(filter)
      .populate("customerId", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),

    OrderModelUser.countDocuments(filter),
  ]);

  // 🔹 Map selected currency amount
  const formattedOrders = orders.map((order) => ({
    ...order,
    totalAmountSelected: order.totalAmount?.[currency] || 0,
    subtotalSelected: order.subtotal?.[currency] || 0,
  }));

  return {
    count: formattedOrders.length,
    pagination: {
      currentPage: pageNum,
      totalPages: Math.ceil(total / limitNum),
      totalItems: total,
      itemsPerPage: limitNum,
    },
    data: formattedOrders,
  };
};

//==============================================================================
export const getSubOrdersByOrderIdService = async (orderId) => {
  return await SubOrderModel.find({ orderId })
    .populate({
      path: "vendorId",
      select: "name email",
    })
    .sort({ createdAt: -1 })
    .lean();
};

//===================================================================
export const getAllSubOrdersService = async (query) => {
  const { page = 1, limit = 10, status, vendorId } = query;

  const filter = {};

  if (status) filter.status = status;
  if (vendorId) filter.vendorId = vendorId;

  const skip = (page - 1) * limit;

  const [subOrders, total] = await Promise.all([
    SubOrderModel.find(filter)
      .populate("orderId", "orderNumber")
      .populate("vendorId", "name email")
      .select(
        "subOrderNumber totalAmount status paymentStatus shippingStatus items createdAt"
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),

    SubOrderModel.countDocuments(filter),
  ]);

  return {
    count: subOrders.length,
    pagination: {
      currentPage: Number(page),
      totalPages: Math.ceil(total / limit),
      totalItems: total,
    },
    data: subOrders.map((subOrder) => ({
      ...subOrder,
      itemsCount: subOrder.items.length, // ✅ number of items
    })),
  };
};
//====================================================
export const getPaymentStatusStatsService = async () => {
  const stats = await OrderModelUser.aggregate([
    {
      $group: {
        _id: "$paymentStatus",
        count: { $sum: 1 },
      },
    },
  ]);

  const result = {
    paid: 0,
    pending: 0,
    failed: 0,
    refunded: 0,
  };

  stats.forEach((item) => {
    if (result.hasOwnProperty(item._id)) {
      result[item._id] = item.count;
    }
  });

  return result;
};
//=============================================
export const getLastDayPaymentStatsService = async () => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  return await OrderModelUser.aggregate([
    {
      $match: {
        createdAt: { $gte: startOfDay },
      },
    },
    {
      $group: {
        _id: "$paymentStatus",
        totalOrders: { $sum: 1 },
        totalRevenue: { $sum: "$totalAmount" },
      },
    },
  ]);
};
//=============================================
export const getLastMonthPaymentStatsService = async () => {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  return await OrderModelUser.aggregate([
    {
      $match: {
        createdAt: { $gte: startOfMonth },
      },
    },
    {
      $group: {
        _id: "$paymentStatus",
        totalOrders: { $sum: 1 },
        totalRevenue: { $sum: "$totalAmount" },
      },
    },
  ]);
};
//========================================================

//============================================
export const getLastMonthSalesAndOrdersService = async (vendorId) => {
  if (!vendorId) throw new Error("Vendor ID is required");

  // Calculate first and last day of last month
  const now = new Date();
  const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastDayLastMonth = new Date(
    now.getFullYear(),
    now.getMonth(),
    0,
    23,
    59,
    59
  );

  const result = await SubOrderModel.aggregate([
    {
      $match: {
        vendorId,
        paymentStatus: "paid", // only count paid suborders
        createdAt: { $gte: firstDayLastMonth, $lte: lastDayLastMonth },
      },
    },
    {
      $group: {
        _id: null,
        totalSales: { $sum: "$totalAmount" }, // sum of all paid suborders
        totalOrders: { $sum: 1 }, // number of suborders
      },
    },
  ]);

  return {
    totalSales: result[0]?.totalSales || 0,
    totalOrders: result[0]?.totalOrders || 0,
  };
};
//=================
export const getCustomersByVendorService = async (vendorId) => {
  if (!vendorId) {
    throw new Error("Vendor ID is required");
  }
  const vendorObjectId = ObjectId.createFromHexString(String(vendorId));
  const customers = await SubOrderModel.aggregate([
    // 1️⃣ Only this vendor + paid orders
    {
      $match: {
        vendorObjectId,
        paymentStatus: "paid",
      },
    },

    // 2️⃣ Join Order to get customerId
    {
      $lookup: {
        from: "orderusers", // ⚠️ collection name
        localField: "orderId",
        foreignField: "_id",
        as: "order",
      },
    },
    { $unwind: "$order" },

    // 3️⃣ Group by customer
    {
      $group: {
        _id: "$order.customerId",
        numSubOrders: { $sum: 1 },
        totalSpent: { $sum: "$totalAmount" },
      },
    },

    // 4️⃣ Join customer data
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "customer",
      },
    },
    { $unwind: "$customer" },

    // 5️⃣ Final response shape
    {
      $project: {
        _id: 0,
        customerId: "$customer._id",
        name: "$customer.name",
        email: "$customer.email",
        country: "$customer.country",
        numSubOrders: 1,
        totalSpent: 1,
      },
    },

    // 6️⃣ Sort by highest spend
    {
      $sort: { totalSpent: -1 },
    },
  ]);

  return customers;
};
