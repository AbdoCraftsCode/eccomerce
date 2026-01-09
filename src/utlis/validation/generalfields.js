import Joi from "joi";
import mongoose from "mongoose";

export const generalfields = {
  _id: Joi.string().custom((value, helpers) => {
    if (!mongoose.Types.ObjectId.isValid(value)) {
      return helpers.error("any.invalid");
    }
    return value;
  }).message("Invalid ID format"),

  fullName: Joi.string().min(3).max(100).trim(),
  
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .trim()
    .messages({
      'string.email': 'Please enter a valid email address',
    }),

  password: Joi.string()
    .pattern(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
    )
    .message(
      'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    ),

  confirmationpassword: Joi.string().valid(Joi.ref('password')).messages({
    'any.only': 'Passwords do not match',
  }),

  username: Joi.string().min(3).max(30).trim(),
};