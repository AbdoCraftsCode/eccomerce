import { OrderModelUser } from "../../DB/models/orderSchemaUser.model.js";
import { getInvoiceMessage } from "./helpers/responseMessages.js";

const localize = (obj, lang = "en") => {
  if (!obj) return "";
  if (typeof obj === "string") return obj;
  return obj[lang] || obj.en || "";
};

const transformInvoiceItem = (item, lang) => {
  const transformed = { ...item };

  if (transformed.product) {
    transformed.product = {
      ...transformed.product,
      name: localize(transformed.product.name, lang),
      description: localize(transformed.product.description, lang),
      currency: transformed.product.currency,
      mainPrice: transformed.product.mainPrice,
      discountPrice: transformed.product.discountPrice,
    };
  }

  if (transformed.variant && transformed.variant.attributes) {
    transformed.variant = {
      ...transformed.variant,
      attributes: transformed.variant.attributes.map((attr) => ({
        ...attr,
        attributeName: localize(attr.attributeName, lang),
        valueName: localize(attr.valueName, lang),
      })),
      mainPrice: transformed.variant.mainPrice,
      discountPrice: transformed.variant.discountPrice,
    };
  }

  return transformed;
};

const transformInvoiceResponse = (order, lang = "en") => {
  if (!order) return order;

  return {
    ...order,
    items: (order.items || []).map((item) =>
      transformInvoiceItem(item, lang)
    ),
    subtotal: order.subtotal,
    totalAmount: order.totalAmount,
    customerCurrency: order.customerCurrency,
    couponUsed: order.couponUsed,
  };
};

export const getAllPaidOrdersService = async (query = {}, lang = "en") => {
  const { page = 1, limit = 10, fromDate, toDate } = query;

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const skip = (pageNum - 1) * limitNum;

  const filter = { status: "confirmed" };

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

  const [orders, total, summaryStats] = await Promise.all([
    OrderModelUser.find(filter)
      .populate("customerId", "name email phone")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),

    OrderModelUser.countDocuments(filter),

    OrderModelUser.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          clients: { $addToSet: "$customerId" },
          invoices: { $sum: 1 },
          paid: {
            $sum: {
              $cond: [{ $eq: ["$paymentStatus", "paid"] }, "$totalAmount.usd", 0],
            },
          },
          unpaid: {
            $sum: {
              $cond: [{ $ne: ["$paymentStatus", "paid"] }, "$totalAmount.usd", 0],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          clients: { $size: "$clients" },
          invoices: 1,
          paid: 1,
          unpaid: 1,
        },
      },
    ]),
  ]);

  const formattedOrders = orders.map((order) =>
    transformInvoiceResponse(order, lang)
  );

  const stats = summaryStats[0] || {
    clients: 0,
    invoices: 0,
    paid: 0,
    unpaid: 0,
  };

  return {
    count: formattedOrders.length,
    pagination: {
      currentPage: pageNum,
      totalPages: Math.ceil(total / limitNum),
      totalItems: total,
      itemsPerPage: limitNum,
    },
    data: formattedOrders,
    summary: {
      Clients: stats.clients,
      Invoices: stats.invoices,
      paid: stats.paid,
      unpaid: stats.unpaid,
    },
  };
};

export const getOrderInvoiceByIdService = async (orderId, lang = "en") => {
  if (!orderId.match(/^[0-9a-fA-F]{24}$/)) {
    throw new Error(getInvoiceMessage("invalid_order_id", lang), {
      cause: 400,
    });
  }

  const order = await OrderModelUser.findById(orderId)
    .populate("customerId", "name email phone")
    .lean();

  if (!order) {
    throw new Error(getInvoiceMessage("order_not_found", lang), {
      cause: 404,
    });
  }

  if (order.status !== "confirmed") {
    throw new Error(getInvoiceMessage("order_not_confirmed", lang), {
      cause: 400,
    });
  }

  const formattedOrder = transformInvoiceResponse(order, lang);

  return formattedOrder;
};
