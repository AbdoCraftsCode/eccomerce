import Joi from "joi";
import { generalfields } from "../../../src/utlis/validation/generalfields.js";

export const createAddressValidation = Joi.object().keys({
  addressName: generalfields.fullName.required(),
  addressDetails: generalfields.fullName.required(),
  latitude: Joi.number().min(-90).max(90).required(),
  longitude: Joi.number().min(-180).max(180).required(),
  isDefault: Joi.boolean().optional()
});

export const updateAddressValidation = Joi.object().keys({
  addressId: generalfields._id.required(),
  addressName: generalfields.fullName,
  addressDetails: generalfields.fullName,
  latitude: Joi.number().min(-90).max(90).optional(),
  longitude: Joi.number().min(-180).max(180).optional(),
  isDefault: Joi.boolean().optional()
});

export const deleteAddressValidation = Joi.object().keys({
  addressId: generalfields._id.required()
});

export const setDefaultAddressValidation = Joi.object().keys({
  addressId: generalfields._id.required()
});

export const getAddressValidation = Joi.object().keys({
  addressId: generalfields._id.required()
});