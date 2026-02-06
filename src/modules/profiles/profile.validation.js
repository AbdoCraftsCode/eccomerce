import Joi from "joi";
import { generalfields } from "../../../src/utlis/validation/generalfields.js";

export const getProfileValidation = Joi.object({});

export const updateProfileValidation = Joi.object({
  fullName: Joi.string().min(2).max(100).optional(),
  companyName: Joi.string().min(5).max(100).optional(),

  email: Joi.string().email().optional(),
  phone: Joi.string()
    .pattern(/^[0-9+-\s()]*$/)
    .optional(),

  password: Joi.string().min(6).optional(),

  country: generalfields._id.optional(),
  currency: generalfields._id.optional(),
  lang: Joi.string().valid("ar", "en").optional(),

  weight: Joi.string().max(10).optional().allow("", null),
  height: Joi.string().max(10).optional().allow("", null),

  preferredFlavor: generalfields._id.optional().allow(null),
  favoritePopgroup: generalfields._id.optional().allow(null),
  productType: generalfields._id.optional().allow(null),
});

export const changePasswordValidation = Joi.object({
  oldPassword: Joi.string().required(),
  newPassword: Joi.string().min(6).required(),
  confirmPassword: Joi.string()
    .valid(Joi.ref("newPassword"))
    .required()
    .messages({
      "any.only": "Confirm password must match new password",
    }),
});

export const confirmEmailValidation = Joi.object({
  emailOTP: Joi.string().length(6).required(),
});

export const resendConfirmEmailValidation = Joi.object({});
