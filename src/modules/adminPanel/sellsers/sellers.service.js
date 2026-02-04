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
//============================================================
export const getLastMonthSalesStatsService = async () => {
    // Get first and last day of last month
    const now = new Date();
    const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  
    // 1️⃣ Total Sales
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
  
    // 2️⃣ Average Seller Rating
    // Aggregate average rating per seller from products
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
  
    // 3️⃣ Average Products per Seller
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
  
    const avgProductsPerSeller = productsPerSellerAgg[0]?.avgProductsPerSeller || 0;
  
    // 4️⃣ Active Sellers Percentage
    const totalVendors = await UserModel.countDocuments({ accountType: "vendor" });
    const activeVendors = await UserModel.countDocuments({ accountType: "vendor", status: "ACCEPTED" });
    const activeSellersPercentage = totalVendors ? (activeVendors / totalVendors) * 100 : 0;
  
    return {
      totalSales,
      avgSellerRating,
      avgProductsPerSeller,
      activeSellersPercentage: parseFloat(activeSellersPercentage.toFixed(2)),
    };
  };
  //====================================================
  export const getAcceptedSellersWithCategories = async () => {
    // 1️⃣ Get all active/accepted vendors
    const vendors = await UserModel.aggregate([
      { $match: { accountType: "vendor", status: "ACCEPTED" } }, // accepted sellers
      {
        $lookup: {
          from: "producttttts", // collection name of products in MongoDB
          localField: "_id",
          foreignField: "createdBy",
          as: "products",
        },
      },
      {
        $unwind: {
          path: "$products",
          preserveNullAndEmptyArrays: true, // include vendors without products
        },
      },
      {
        $lookup: {
          from: "categoryyyys", // collection name of categories in MongoDB
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
          categories: { $addToSet: "$categories" }, // remove duplicates
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
      { $sort: { name: 1 } }, // optional: sort by name
    ]);
  
    return vendors;
  };
  //=====================================================================
  export const getLatestSellersService = async (limit = 5) => {
    const filter = { accountType: "vendor" };
  
    // لو عايز المقبولين فقط
    // if (onlyActive) {
    //   filter.status = "active"; // أو accepted حسب عندك
    // }
  
    const sellers = await UserModel.find(filter)
      .select("name email status createdAt") // اختار اللي تحتاجه
      .sort({ createdAt: -1 }) // الأحدث أولاً
      .limit(limit)
      .lean();
  
    return sellers;
  };
  //======================================================
    export const getCategorySalesService = async (lang = "en") => {
      return await SubOrderModel.aggregate([
        {
          $match: {
            paymentStatus: "paid",
          },
        },
    
        // 1️⃣ explode items
        { $unwind: "$items" },
    
        // 2️⃣ get product
        {
          $lookup: {
            from: "producttttts",
            localField: "items.productId",
            foreignField: "_id",
            as: "product",
          },
        },
        { $unwind: "$product" },
    
        // 3️⃣ explode product categories
        { $unwind: "$product.categories" },
    
        // 4️⃣ get category
        {
          $lookup: {
            from: "categoryyyys",
            localField: "product.categories",
            foreignField: "_id",
            as: "category",
          },
        },
        { $unwind: "$category" },
    
        // 5️⃣ group per category
        {
          $group: {
            _id: "$category._id",
            categoryNameAr: { $first: "$category.name.ar" },
            categoryNameEn: { $first: "$category.name.en" },
            totalQuantity: { $sum: "$items.quantity" },
          },
        },
    
        // 6️⃣ get grand total quantity
        {
          $group: {
            _id: null,
            categories: { $push: "$$ROOT" },
            grandTotalQuantity: { $sum: "$totalQuantity" },
          },
        },
    
        // 7️⃣ calculate percentage
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
                      $divide: [
                        "$categories.totalQuantity",
                        "$grandTotalQuantity",
                      ],
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
      ]);
    };
    
    