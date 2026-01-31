import Joi from "joi";
import { generalfields } from "../../utlis/validation/generalfields.js";

export const createCountrySchema = Joi.object({
  name: Joi.object({
    en: Joi.string().min(2).max(50).required().trim()
      .messages({
        'string.empty': 'English name is required',
        'any.required': 'English name is required'
      }),
    ar: Joi.string().min(2).max(50).required().trim()
      .messages({
        'string.empty': 'Arabic name is required',
        'any.required': 'Arabic name is required'
      }),
  }).required(),
  isDefault: Joi.boolean().default(false),
});


export const countryIdSchema = Joi.object({
  id: generalfields._id.required(),
});

export const toggleStatusSchema = Joi.object({
  id: generalfields._id.required(),
  isActive: Joi.boolean().required(),
});