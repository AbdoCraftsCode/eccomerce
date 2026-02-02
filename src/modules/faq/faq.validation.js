import Joi from "joi";
import { generalfields } from "../../utlis/validation/generalfields.js";

export const createFaqValidation = Joi.object().keys({
  question: Joi.object({
    ar: Joi.string().min(5).max(1000).required().trim(),
    en: Joi.string().min(5).max(1000).required().trim(),
  }).required(),
  answer: Joi.object({
    ar: Joi.string().min(5).max(5000).required().trim(),
    en: Joi.string().min(5).max(5000).required().trim(),
  }).required(),
  category: Joi.string()
    .valid("general", "account", "service", "payment")
    .required(),
});

export const deleteFaqValidation = Joi.object().keys({
  faqId: generalfields._id.required(),
});

export const getFaqsValidation = Joi.object().keys({
  category: Joi.string()
    .valid("general", "account", "service", "payment")
    .required(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
});