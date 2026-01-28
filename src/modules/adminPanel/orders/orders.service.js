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
        page = 1,
        limit = 10,
      } = query;
    
      const pageNum = Math.max(1, parseInt(page));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
      const skip = (pageNum - 1) * limitNum;
    
      // 🔹 Build dynamic filter
      const filter = {};
    
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
    
      // 🔹 Fetch orders + count
      const [orders, total] = await Promise.all([
        OrderModelUser.find(filter)
          .populate("customerId", "name email")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .lean(),
    
        OrderModelUser.countDocuments(filter),
      ]);
    
      return {
        count: orders.length,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalItems: total,
          itemsPerPage: limitNum,
        },
        data: orders,
      };
    };
//==============================================================================
export const getSubOrdersByOrderIdService = async (orderId) => {
  return await SubOrderModel.find({ orderId })
    .populate({
      path: "vendorId",
      select: "name email",
    })
    .populate({
      path: "items.productId",
      select: "name images",
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
//============================================
