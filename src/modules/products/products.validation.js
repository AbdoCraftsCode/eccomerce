import Joi from "joi";
import { generalfields } from "../../utlis/validation/generalfields.js";

export const getProductsSchema = Joi.object({
  categoryId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).optional(),
  subCategoryId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).optional(),
  brandId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).optional(),
  minPrice: Joi.number().min(0).optional(),
  maxPrice: Joi.number().min(0).optional(),
  search: Joi.string().trim().optional(),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  hasOffer: Joi.boolean().optional(),
});

export const getProductByIdSchema = Joi.object({
  productId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      "string.pattern.base": "Invalid product ID format",
      "any.required": "Product ID is required",
    }),
});
