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
    export const getLatestOrdersService = async (limit = 10) => {
        return await OrderModelUser.aggregate([
          // 1️⃣ Sort latest first
          {
            $sort: { createdAt: -1 },
          },
      
          // 2️⃣ Limit results
          {
            $limit: Number(limit),
          },
      
          // 3️⃣ Join customer data
          {
            $lookup: {
              from: "users", // ⚠️ collection name
              localField: "customerId",
              foreignField: "_id",
              as: "customer",
            },
          },
      
          // 4️⃣ Unwind customer
          {
            $unwind: "$customer",
          },
      
          // 5️⃣ Add number of subOrders
          {
            $addFields: {
              subOrdersCount: {
                $size: { $ifNull: ["$items", []] },
              },
            },
          },
      
          // 6️⃣ Select required fields only
          {
            $project: {
              orderNumber: 1,
              createdAt: 1,
              totalAmount: 1,
              paymentStatus: 1,
              shippingStatus: 1,
              subOrdersCount: 1,
              "customer._id": 1,
              "customer.name": 1,
              "customer.email": 1,
            },
          },
        ]);
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

  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 10));
  const skip = (page - 1) * limit;

  const filter = {
    vendorId,
  };

  const [subOrders, total] = await Promise.all([
    SubOrderModel.find(filter)
      .populate("orderId", "orderNumber createdAt paymentStatus")
      .populate({
        path: "items.productId",  // ✅ nested populate
        select: "name mainPrice", // choose the fields you want
        model: "Producttttt",
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),

    SubOrderModel.countDocuments(filter),
  ]);

  return {
    count: subOrders.length,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalItems: total,
      itemsPerPage: limit,
    },
    data: subOrders,
  };
};