import Joi from "joi";
import { generalfields } from "../../../src/utlis/validation/generalfields.js";

export const addToCartValidation = Joi.object().keys({
  productId: generalfields._id.required(),
  variantId: generalfields._id.optional()
});

export const updateQuantityValidation = Joi.object().keys({
  productId: generalfields._id.required(),
  variantId: generalfields._id.optional(),
  action: Joi.string().valid("increase", "decrease").required()
});

export const deleteItemFromCartValidation = Joi.object().keys({
  productId: generalfields._id.required(),
  variantId: generalfields._id.optional()
});