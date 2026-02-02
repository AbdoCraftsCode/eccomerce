import { asyncHandelr } from "../../utlis/response/error.response.js";
import * as faqService from "./services/faq.service.js";
import { getResponseMessage } from "./helpers/responseMessages.js";
import { getUserLanguage } from "../../utlis/localization/langUserHelper.js";

export const createFaq = asyncHandelr(async (req, res) => {
  const lang = getUserLanguage(req);
  const faq = await faqService.createFaq(req, lang);

  res.status(201).json({
    success: true,
    message: getResponseMessage("created", lang),
    data: faq,
  });
});

export const deleteFaq = asyncHandelr(async (req, res) => {
  const lang = getUserLanguage(req);
  await faqService.deleteFaq(req, lang);

  res.status(200).json({
    success: true,
    message: getResponseMessage("deleted", lang),
  });
});

export const getFaqsByCategory = asyncHandelr(async (req, res) => {
  const lang = getUserLanguage(req);
  const result = await faqService.getFaqsByCategory(req, lang);

  res.status(200).json({
    success: true,
    message: getResponseMessage("fetched", lang),
    data: result,
  });
});