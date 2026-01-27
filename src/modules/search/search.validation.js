import Joi from "joi";

export const searchProductsValidation = Joi.object({
  q: Joi.string().trim().min(1).required().messages({
    "string.base": "Search query must be a string",
    "string.empty": "Search query is required",
    "any.required": "Search query is required",
  }),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(20),
  lang: Joi.string().valid("en", "ar").optional(),
});