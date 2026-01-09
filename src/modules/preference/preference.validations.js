
import Joi from 'joi';
import { generalfields } from "../../../src/utlis/validation/generalfields.js";


const basePreferenceSchema = {
  nameAr: Joi.string().min(2).max(100).required().messages({
    'string.empty': 'Arabic name is required',
    'string.min': 'Arabic name must be at least 2 characters'
  }),
  nameEn: Joi.string().min(2).max(100).required().messages({
    'string.empty': 'English name is required',
    'string.min': 'English name must be at least 2 characters'
  }),
  descriptionAr: Joi.string().max(500).optional().allow('', null),
  descriptionEn: Joi.string().max(500).optional().allow('', null),
  isActive: Joi.boolean().optional(),
  sortOrder: Joi.number().integer().min(0).optional(),
  icon: Joi.string().optional().allow('', null),
  image: Joi.object({
    url: Joi.string().uri().optional(),
    public_id: Joi.string().optional()
  }).optional()
};

// Preferred Flavor
export const createFlavorValidation = Joi.object({
  ...basePreferenceSchema
});

export const updateFlavorValidation = Joi.object({
  id: generalfields._id.required(),
  ...Object.fromEntries(
    Object.entries(basePreferenceSchema).map(([key, value]) => [key, value.optional()])
  )
});

// Favorite Popgroup
export const createPopgroupValidation = Joi.object({
  nameAr: Joi.string().min(2).max(100).required(),
  nameEn: Joi.string().min(2).max(100).required(),
  descriptionAr: Joi.string().max(500).optional().allow('', null),
  descriptionEn: Joi.string().max(500).optional().allow('', null),
  isActive: Joi.boolean().optional(),
  sortOrder: Joi.number().integer().min(0).optional()
});

export const updatePopgroupValidation = Joi.object({
  id: generalfields._id.required(),
  nameAr: Joi.string().min(2).max(100).optional(),
  nameEn: Joi.string().min(2).max(100).optional(),
  descriptionAr: Joi.string().max(500).optional().allow('', null),
  descriptionEn: Joi.string().max(500).optional().allow('', null),
  isActive: Joi.boolean().optional(),
  sortOrder: Joi.number().integer().min(0).optional()
  // Note: image will come from req.files, not req.body
});

export const updatePopgroupImageValidation = Joi.object({
  id: generalfields._id.required()
});

export const removePopgroupImageValidation = Joi.object({
  id: generalfields._id.required()
});

// Preferred Product Type
export const createProductTypeValidation = Joi.object({
  ...basePreferenceSchema,
  category: Joi.string().valid('food', 'beverage', 'snack', 'other').optional()
});

export const updateProductTypeValidation = Joi.object({
  id: generalfields._id.required(),
  ...Object.fromEntries(
    Object.entries(basePreferenceSchema).map(([key, value]) => [key, value.optional()])
  ),
  category: Joi.string().valid('food', 'beverage', 'snack', 'other').optional()
});

// Common delete validation
export const deletePreferenceValidation = Joi.object({
  id: generalfields._id.required()
});

// Get by language validation
export const getPreferencesValidation = Joi.object({
  lang: Joi.string().valid('ar', 'en').default('en'),
  page: Joi.number().min(1).optional().default(1),
  limit: Joi.number().min(1).max(100).optional().default(10),
  isActive: Joi.boolean().optional(),
  search: Joi.string().optional()
});