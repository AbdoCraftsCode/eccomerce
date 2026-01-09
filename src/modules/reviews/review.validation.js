// review.validation.js
import Joi from "joi";
import { generalfields } from "../../../src/utlis/validation/generalfields.js";

export const createReviewValidation = Joi.object().keys({
  productId: generalfields._id.required(),
  variantId: generalfields._id.optional(),
  rating: Joi.number().integer().min(1).max(5).required(),
  comment: Joi.string().min(3).max(1000).required(),
});

export const updateReviewValidation = Joi.object().keys({
  reviewId: generalfields._id.required(),
  rating: Joi.number().integer().min(1).max(5).optional(),
  comment: Joi.string().min(3).max(1000).optional(),
});

export const deleteReviewValidation = Joi.object().keys({
  reviewId: generalfields._id.required(),
});

export const deleteReviewImagesValidation = Joi.object().keys({
  reviewId: generalfields._id.required(),
  imageIds: Joi.array()
    .items(Joi.string().required())
    .min(1)
    .required()
    .messages({
      "array.base": "imageIds must be an array",
      "array.min": "At least one image ID is required",
      "any.required": "imageIds is required",
    }),
});

export const getReviewValidation = Joi.object().keys({
  reviewId: generalfields._id.required(),
});

export const getProductReviewsValidation = Joi.object().keys({
  productId: generalfields._id.required(),
  page: Joi.number().min(1).optional(),
  limit: Joi.number().min(1).max(50).optional(),
  rating: Joi.number().min(1).max(5).optional(),
  sortBy: Joi.string()
    .valid("newest", "oldest", "highest", "lowest")
    .optional(),
});
