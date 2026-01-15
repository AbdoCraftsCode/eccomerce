import Joi from "joi";
import { generalfields } from "../../../src/utlis/validation/generalfields.js";

export const addToCartValidation = Joi.object().keys({
  productId: generalfields._id.required(),
  variantId: generalfields._id.optional(),
  quantity: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(1)
    .messages({
      "number.base": "Quantity must be a number",
      "number.integer": "Quantity must be a whole number",
      "number.min": "Quantity must be at least 1",
      "number.max": "Quantity cannot exceed 100",
    })
    .optional(),
});

export const updateQuantityValidation = Joi.object().keys({
  productId: generalfields._id.required(),
  variantId: generalfields._id.optional(),
  action: Joi.string().valid("increase", "decrease").required(),
});

export const deleteItemFromCartValidation = Joi.object().keys({
  productId: generalfields._id.required(),
  variantId: generalfields._id.optional(),
});
