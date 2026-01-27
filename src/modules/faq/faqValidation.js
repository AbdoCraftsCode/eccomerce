import Joi from "joi";
import { generalfields } from "../../../src/utlis/validation/generalfields.js";

export const createFaqValidation = Joi.object().keys({
  question: Joi.string().min(5).max(1000).required().trim(),
  answer: Joi.string().min(5).max(5000).required().trim(),
  category: Joi.string().valid("general", "account", "service", "payment").required(),
});

export const getFaqsValidation = Joi.object().keys({
  category: Joi.string().valid("general", "account", "service", "payment").required(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
});

export const deleteFaqValidation = Joi.object().keys({
  faqId: generalfields._id.required(),
});