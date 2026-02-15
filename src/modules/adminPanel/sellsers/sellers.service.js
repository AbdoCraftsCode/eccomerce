import UserModel from "../../../DB/models/User.model.js";
import { ProductModellll } from "../../../DB/models/productSchemaaaa.js";
import { OrderModelUser } from "../../../DB/models/orderSchemaUser.model.js";
import { SubOrderModel } from "../../../DB/models/subOrdersSchema.model.js";

export const getSellerAndProductStatsService = async () => {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const result = await UserModel.aggregate([
    {
      $match: {
        accountType: "vendor",
      },
    },
    {
      $facet: {
        totalSellers: [{ $count: "count" }],

        activeSellers: [
          { $match: { status: "ACCEPTED" } },
          { $count: "count" },
        ],

        pendingSellers: [
          { $match: { status: "PENDING" } },
          { $count: "count" },
        ],

        suspendedSellers: [
          { $match: { status: "REFUSED" } },
          { $count: "count" },
        ],

        newSellersThisMonth: [
          { $match: { createdAt: { $gte: startOfMonth } } },
          { $count: "count" },
        ],
      },
    },
  ]);

  const productCount = await ProductModellll.countDocuments();

  return {
    totalSellers: result[0].totalSellers[0]?.count || 0,
    activeSellers: result[0].activeSellers[0]?.count || 0,
    pendingSellers: result[0].pendingSellers[0]?.count || 0,
    suspendedSellers: result[0].suspendedSellers[0]?.count || 0,
    newSellersThisMonth: result[0].newSellersThisMonth[0]?.count || 0,
    totalProducts: productCount,
  };
};

export const getLastMonthSalesStatsService = async () => {
  const now = new Date();
  const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastDayLastMonth = new Date(
    now.getFullYear(),
    now.getMonth(),
    0,
    23,
    59,
    59,
    999,
  );

  const totalSalesAgg = await OrderModelUser.aggregate([
    {
      $match: {
        paymentStatus: "paid",
        createdAt: { $gte: firstDayLastMonth, $lte: lastDayLastMonth },
      },
    },
    {
      $group: {
        _id: null,
        totalSales: { $sum: { $toDouble: "$totalAmount" } },
      },
    },
  ]);

  const totalSales = totalSalesAgg[0]?.totalSales || 0;

  const avgRatingAgg = await ProductModellll.aggregate([
    {
      $group: {
        _id: "$createdBy",
        avgRating: { $avg: "$rating.average" },
      },
    },
    {
      $group: {
        _id: null,
        overallAvgRating: { $avg: "$avgRating" },
      },
    },
  ]);

  const avgSellerRating = avgRatingAgg[0]?.overallAvgRating || 0;

  const productsPerSellerAgg = await ProductModellll.aggregate([
    {
      $group: {
        _id: "$createdBy",
        count: { $sum: 1 },
      },
    },
    {
      $group: {
        _id: null,
        avgProductsPerSeller: { $avg: "$count" },
      },
    },
  ]);

  const avgProductsPerSeller =
    productsPerSellerAgg[0]?.avgProductsPerSeller || 0;

  const totalVendors = await UserModel.countDocuments({
    accountType: "vendor",
  });
  const activeVendors = await UserModel.countDocuments({
    accountType: "vendor",
    status: "ACCEPTED",
  });
  const activeSellersPercentage = totalVendors
    ? (activeVendors / totalVendors) * 100
    : 0;

  return {
    totalSales,
    avgSellerRating,
    avgProductsPerSeller,
    activeSellersPercentage: parseFloat(activeSellersPercentage.toFixed(2)),
  };
};

export const getAcceptedSellersWithCategories = async () => {
  const vendors = await UserModel.aggregate([
    { $match: { accountType: "vendor", status: "ACCEPTED" } },
    {
      $lookup: {
        from: "producttttts",
        localField: "_id",
        foreignField: "createdBy",
        as: "products",
      },
    },
    {
      $unwind: {
        path: "$products",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "categoryyyys",
        localField: "products.categories",
        foreignField: "_id",
        as: "categories",
      },
    },
    {
      $group: {
        _id: "$_id",
        name: { $first: "$name" },
        email: { $first: "$email" },
        categories: { $addToSet: "$categories" },
        totalProducts: { $sum: 1 },
      },
    },
    {
      $project: {
        _id: 1,
        name: 1,
        email: 1,
        totalProducts: 1,
        categories: {
          $reduce: {
            input: "$categories",
            initialValue: [],
            in: { $setUnion: ["$$value", "$$this"] },
          },
        },
      },
    },
    { $sort: { name: 1 } },
  ]);

  return vendors;
};

export const getLatestSellersService = async (limit = 5) => {
  const filter = { accountType: "vendor" };

  const sellers = await UserModel.find(filter)
    .select("name email status createdAt")
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return sellers;
};

export const getCategorySalesService = async (lang = "en") => {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const stats = await SubOrderModel.aggregate([
    {
      $match: {
        status: "confirmed",
        createdAt: { $gte: startOfMonth },
      },
    },

    { $unwind: "$items" },

    {
      $lookup: {
        from: "producttttts",
        localField: "items.product._id",
        foreignField: "_id",
        as: "product",
      },
    },
    { $unwind: "$product" },

    { $unwind: "$product.categories" },

    {
      $lookup: {
        from: "categoryyyys",
        localField: "product.categories",
        foreignField: "_id",
        as: "category",
      },
    },
    { $unwind: "$category" },

    {
      $group: {
        _id: "$category._id",
        categoryNameAr: { $first: "$category.name.ar" },
        categoryNameEn: { $first: "$category.name.en" },
        totalQuantity: { $sum: "$items.quantity" },
      },
    },

    {
      $group: {
        _id: null,
        categories: { $push: "$$ROOT" },
        grandTotalQuantity: { $sum: "$totalQuantity" },
      },
    },

    { $unwind: "$categories" },

    {
      $project: {
        categoryName: {
          $cond: [
            { $eq: [lang, "ar"] },
            "$categories.categoryNameAr",
            "$categories.categoryNameEn",
          ],
        },
        totalQuantity: "$categories.totalQuantity",
        percentage: {
          $round: [
            {
              $multiply: [
                {
                  $divide: ["$categories.totalQuantity", "$grandTotalQuantity"],
                },
                100,
              ],
            },
            2,
          ],
        },
        _id: 0,
      },
    },

    { $sort: { percentage: -1 } },
    { $limit: 5 },
  ]);

  const categorySales = {};
  stats.forEach((item) => {
    categorySales[item.categoryName] = item.percentage;
  });

  return categorySales;
};

export const getVendorGrowthGraphService = async () => {
  const now = new Date();
  const currentYear = now.getFullYear();

  const xAxis = [];
  const promises = [];

  for (let month = 1; month <= 12; month++) {
    xAxis.push(month);

    const endOfMonth = new Date(currentYear, month, 0, 23, 59, 59, 999);
    
    const startOfMonth = new Date(currentYear, month - 1, 1, 0, 0, 0, 0);

    if (startOfMonth <= now) {
      promises.push(
        (async () => {
          const [total, activeIds] = await Promise.all([
            UserModel.countDocuments({
              accountType: "vendor",
              createdAt: { $lte: endOfMonth },
            }),

            SubOrderModel.distinct("vendorId", {
              status: "confirmed",
              createdAt: { $gte: startOfMonth, $lte: endOfMonth },
            }),
          ]);

          return { 
            monthIndex: month - 1, 
            total, 
            active: activeIds.length 
          };
        })()
      );
    } 
  }

  const results = await Promise.all(promises);

  const finalTotal = new Array(12).fill(0);
  const finalActive = new Array(12).fill(0);

  results.forEach(({ monthIndex, total, active }) => {
    finalTotal[monthIndex] = total;
    finalActive[monthIndex] = active;
  });

  return {
    xAxis,
    totalVendors: finalTotal,
    activeVendors: finalActive,
  };
};
