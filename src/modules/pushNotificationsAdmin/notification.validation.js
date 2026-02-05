import Joi from "joi";
import { generalfields } from "../../utlis/validation/generalfields.js";

export const createNotificationValidation = Joi.object().keys({
  type: Joi.string().valid("transactional", "marketing", "user_specific").required(),
  title: Joi.object({
    ar: Joi.string().required().trim(),
    en: Joi.string().required().trim(),
  }).required(),
  body: Joi.object({
    ar: Joi.string().required().trim(),
    en: Joi.string().required().trim(),
  }).required(),
  clickProcedure: Joi.string().valid("no_procedure", "open_page_in_app", "open_external_link").required(),
  externalLink: Joi.string().optional(),
  audienceType: Joi.string().valid("all_users", "saved_slide", "specific_users", "specific_filters").required(),
  audienceDetails: Joi.object().optional(), 
  sendAt: Joi.date().min("now").optional(), 
});

export const getNotificationsValidation = Joi.object().keys({
  type: Joi.string().optional(),
  status: Joi.string().valid("pending", "sending", "done", "failed").optional(),
  fromDate: Joi.date().optional(),
  toDate: Joi.date().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
});