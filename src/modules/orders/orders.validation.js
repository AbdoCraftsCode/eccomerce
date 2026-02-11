import Joi from "joi";

export const getUserOrdersSchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  sort: Joi.string().valid("createdAt", "totalAmount", "status").optional(),
  order: Joi.string().valid("asc", "desc").optional(),
  paymentStatus: Joi.string().valid("pending", "paid", "cash_on_delivery", "failed").optional(),
});
