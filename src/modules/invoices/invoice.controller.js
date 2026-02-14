import { asyncHandelr } from "../../utlis/response/error.response.js";
import * as invoiceService from "./invoice.service.js";
import { getInvoiceMessage } from "./helpers/responseMessages.js";
import { getUserLanguage } from "../../utlis/localization/langUserHelper.js";


export const getAllPaidOrders = asyncHandelr(async (req, res) => {
  const lang = getUserLanguage(req);
  const { page, limit, fromDate, toDate } = req.query;

  const result = await invoiceService.getAllPaidOrdersService(
    { page, limit, fromDate, toDate },
    lang
  );

  res.status(200).json({
    success: true,
    message: getInvoiceMessage("invoices_fetched", lang),
    count: result.count,
    pagination: result.pagination,
    data: result.data,
  });
});

/**
 * Get specific order invoice by ID
 * @route GET /invoices/:orderId
 * @access Admin only
 */
export const getOrderInvoiceById = asyncHandelr(async (req, res) => {
  const lang = getUserLanguage(req);
  const { orderId } = req.params;

  const invoice = await invoiceService.getOrderInvoiceByIdService(
    orderId,
    lang
  );

  res.status(200).json({
    success: true,
    message: getInvoiceMessage("invoice_fetched", lang),
    data: invoice,
  });
});
