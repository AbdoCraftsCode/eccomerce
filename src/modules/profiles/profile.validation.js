// profile.validation.js
import Joi from "joi";
import { generalfields } from "../../../src/utlis/validation/generalfields.js";

export const getProfileValidation = Joi.object({});

export const updateProfileValidation = Joi.object({
  fullName: Joi.string().min(2).max(100).optional(),
  
  email: Joi.string().email().optional(),
  phone: Joi.string().pattern(/^[0-9+-\s()]*$/).optional(),
  
  password: Joi.string().min(6).optional(),
  
  country: Joi.string().max(100).optional(),
  currency: Joi.string().length(3).optional(),
  lang: Joi.string().valid('ar', 'en', 'fr', 'es', 'de', 'it').optional(),
  
  weight: Joi.string().max(10).optional().allow('', null),
  height: Joi.string().max(10).optional().allow('', null),

  preferredFlavor: generalfields._id.optional().allow(null),
  favoritePopgroup: generalfields._id.optional().allow(null),
  productType: generalfields._id.optional().allow(null),

});