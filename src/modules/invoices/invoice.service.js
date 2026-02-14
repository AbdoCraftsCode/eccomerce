import { OrderModelUser } from "../../DB/models/orderSchemaUser.model.js";
import { getInvoiceMessage } from "./helpers/responseMessages.js";

/**
 * Localizes text content from multi-language objects
 * @param {Object|string} obj - Localized object with {ar, en} or plain string
 * @param {string} lang - Target language ('ar' or 'en')
 * @returns {string} - Localized string
 */
const localize = (obj, lang = "en") => {
  if (!obj) return "";
  if (typeof obj === "string") return obj;
  return obj[lang] || obj.en || "";
};

/**
 * Transforms order item for invoice response with localization
 * @param {Object} item - Order item
 * @param {string} lang - Target language
 * @returns {Object} - Transformed item with localized content
 */
const transformInvoiceItem = (item, lang) => {
  const transformed = { ...item };

  // Localize product information
  if (transformed.product) {
    transformed.product = {
      ...transformed.product,
      name: localize(transformed.product.name, lang),
      description: localize(transformed.product.description, lang),
      // Keep currency details for reference
      currency: transformed.product.currency,
      // Keep all price fields (vendor, customer, usd)
      mainPrice: transformed.product.mainPrice,
      discountPrice: transformed.product.discountPrice,
    };
  }

  // Localize variant information
  if (transformed.variant && transformed.variant.attributes) {
    transformed.variant = {
      ...transformed.variant,
      attributes: transformed.variant.attributes.map((attr) => ({
        ...attr,
        attributeName: localize(attr.attributeName, lang),
        valueName: localize(attr.valueName, lang),
      })),
      // Keep all price fields
      mainPrice: transformed.variant.mainPrice,
      discountPrice: transformed.variant.discountPrice,
    };
  }

  // Keep all price fields for the item (vendor, customer, usd)
  return transformed;
};

/**
 * Transforms order for invoice response with complete financial information
 * @param {Object} order - Raw order object from database
 * @param {string} lang - Target language ('en' or 'ar')
 * @returns {Object} - Transformed order with localized content and complete pricing
 */
const transformInvoiceResponse = (order, lang = "en") => {
  if (!order) return order;

  return {
    ...order,
    // Transform all items with localization
    items: (order.items || []).map((item) =>
      transformInvoiceItem(item, lang)
    ),
    // Keep all price fields (vendor, customer, usd)
    subtotal: order.subtotal,
    totalAmount: order.totalAmount,
    // Keep customer currency details for invoice
    customerCurrency: order.customerCurrency,
    // Keep coupon information with all price details
    couponUsed: order.couponUsed,
  };
};

/**
 * Get all paid orders as invoices with pagination and filtering
 * @param {Object} query - Query parameters
 * @param {string} lang - Language code
 * @returns {Object} - Paginated invoices data with complete pricing
 */
export const getAllPaidOrdersService = async (query = {}, lang = "en") => {
  const { page = 1, limit = 10, fromDate, toDate } = query;

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const skip = (pageNum - 1) * limitNum;

  // Build filter - only paid orders
  const filter = { paymentStatus: "paid" };

  // Add date range filter if provided
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

  // Fetch orders and total count in parallel
  const [orders, total] = await Promise.all([
    OrderModelUser.find(filter)
      .populate("customerId", "name email phone")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),

    OrderModelUser.countDocuments(filter),
  ]);

  // Transform orders with localization while keeping all price information
  const formattedOrders = orders.map((order) =>
    transformInvoiceResponse(order, lang)
  );

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

/**
 * Get specific order invoice by order ID
 * @param {string} orderId - Order ID
 * @param {string} lang - Language code
 * @returns {Object} - Order invoice data with complete pricing
 */
export const getOrderInvoiceByIdService = async (orderId, lang = "en") => {
  // Validate ObjectId format
  if (!orderId.match(/^[0-9a-fA-F]{24}$/)) {
    throw new Error(getInvoiceMessage("invalid_order_id", lang), {
      cause: 400,
    });
  }

  // Find order and populate customer details
  const order = await OrderModelUser.findById(orderId)
    .populate("customerId", "name email phone")
    .lean();

  // Check if order exists
  if (!order) {
    throw new Error(getInvoiceMessage("order_not_found", lang), {
      cause: 404,
    });
  }

  // Check if order is paid
  if (order.paymentStatus !== "paid") {
    throw new Error(getInvoiceMessage("order_not_paid", lang), {
      cause: 400,
    });
  }

  // Transform order with localization while keeping all price information
  const formattedOrder = transformInvoiceResponse(order, lang);

  return formattedOrder;
};
