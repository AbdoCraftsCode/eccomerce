import { asyncHandelr } from "../../utlis/response/error.response.js";
import * as ordersService from "./services/orders.service.js";
import { getResponseMessage } from "./helpers/responseMessages.js";
import { getUserLanguage } from "../../utlis/localization/langUserHelper.js";

export const getUserOrders = asyncHandelr(async (req, res) => {
  const lang = getUserLanguage(req);
  const { page, limit, sort, order, orderStatus } = req.query;

  const result = await ordersService.getUserOrders(req.user._id, {
    page,
    limit,
    sort,
    order,
    orderStatus,
    lang,
  });

  res.status(200).json({
    success: true,
    message: getResponseMessage("fetched", lang),
    data: result.orders,
    pagination: result.pagination,
  });
});
