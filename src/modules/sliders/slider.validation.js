import Joi from "joi";
import { generalfields } from "../../utlis/validation/generalfields.js";

export const createSliderValidation = Joi.object().keys({
  type: Joi.string()
    .valid("product", "offer", "brand", "category", "default")
    .required(),
  referenceId: generalfields._id.optional(), 
});

export const updateSliderValidation = Joi.object().keys({
  sliderId: generalfields._id.required(),
  type: Joi.string()
    .valid("product", "offer", "brand", "category", "default")
    .optional(),
  referenceId: generalfields._id.optional(),
});

export const deleteSliderValidation = Joi.object().keys({
  sliderId: generalfields._id.required(),
});

export const getSlidersValidation = Joi.object().keys({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
});