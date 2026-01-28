import Joi from "joi";
import { generalfields } from "../../../src/utlis/validation/generalfields.js";

export const createOfferValidation = Joi.object().keys({
  nameAr: Joi.string().min(3).max(200).required().trim(),
  nameEn: Joi.string().min(3).max(200).required().trim(),
  descriptionAr: Joi.string().max(2000).trim(),
  descriptionEn: Joi.string().max(2000).trim(),
  products: Joi.array()
    .items(
      Joi.object({
        productId: generalfields._id.required(),
        variantId: generalfields._id,
        quantity: Joi.number().integer().min(1).default(1),
      })
    )
    .min(1)
    .required(),
  offerPrice: Joi.number().min(0).required(),
  currency: Joi.string().default("USD"),
  startDate: Joi.date().greater("now").required(),
  endDate: Joi.date().greater(Joi.ref("startDate")).required(),
});

export const approveOfferValidation = Joi.object().keys({
  offerId: generalfields._id.required(),
  status: Joi.string().valid("active", "rejected").required(),
});

export const getOffersValidation = Joi.object().keys({
  status: Joi.string().valid("pending", "active", "expired", "rejected"),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  vendorId: generalfields._id,
});

export const deleteOfferValidation = Joi.object().keys({
  offerId: generalfields._id.required(),
});

export const updateOfferValidation = Joi.object().keys({
  offerId: generalfields._id.required(),
  nameAr: Joi.string().min(3).max(200).trim(),
  nameEn: Joi.string().min(3).max(200).trim(),
  descriptionAr: Joi.string().max(2000).trim(),
  descriptionEn: Joi.string().max(2000).trim(),
  products: Joi.array()
    .items(
      Joi.object({
        productId: generalfields._id.required(),
        variantId: generalfields._id,
        quantity: Joi.number().integer().min(1).default(1),
      })
    )
    .min(1),
  offerPrice: Joi.number().min(0),
  currency: Joi.string(),
  startDate: Joi.date().greater("now"),
  endDate: Joi.date().greater(Joi.ref("startDate")),
});


export const getVendorOffersValidation = Joi.object().keys({
  status: Joi.string().valid("pending", "active", "expired", "rejected"),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
});