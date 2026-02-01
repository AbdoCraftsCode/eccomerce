import { asyncHandelr } from "../../utlis/response/error.response.js";
import * as offerService from "./services/offerService.js";
import { getResponseMessage } from "./helpers/responseMessages.js";
import { getUserLanguage } from "../../utlis/localization/langUserHelper.js";

export const createOffer = asyncHandelr(async (req, res) => {
  const lang = getUserLanguage(req);
  const offer = await offerService.createOffer(req, lang);

  res.status(201).json({
    success: true,
    message: getResponseMessage("created", lang),
    data: offer,
  });
});

export const updateOffer = asyncHandelr(async (req, res) => {
  const lang = getUserLanguage(req);
  const updatedOffer = await offerService.updateOffer(req, lang);

  res.status(200).json({
    success: true,
    message: getResponseMessage("updated", lang),
    data: updatedOffer,
  });
});

export const approveOffer = asyncHandelr(async (req, res) => {
  const lang = getUserLanguage(req);
  const offer = await offerService.approveOffer(req, lang);

  res.status(200).json({
    success: true,
    message: getResponseMessage(
      offer.status === "active" ? "approved" : "rejected",
      lang,
    ),
    data: offer,
  });
});

export const getOffers = asyncHandelr(async (req, res) => {
  const lang = getUserLanguage(req);
  const result = await offerService.getOffers(req, lang);

  res.status(200).json({
    success: true,
    message: getResponseMessage("fetched", lang),
    data: result,
  });
});

export const deleteOffer = asyncHandelr(async (req, res) => {
  const lang = getUserLanguage(req);
  await offerService.deleteOffer(req, lang);

  res.status(200).json({
    success: true,
    message: getResponseMessage("deleted", lang),
  });
});

export const getMyOffers = asyncHandelr(async (req, res) => {
  const lang = getUserLanguage(req);
  const result = await offerService.getMyOffers(req, lang);

  res.status(200).json({
    success: true,
    message: getResponseMessage("fetched_my", lang),
    data: result,
  });
});

export const getOfferById = asyncHandelr(async (req, res, next) => {
  const lang = getUserLanguage(req);
  const offer = await offerService.getOfferById(req, lang);

  res.status(200).json({
    success: true,
    message: getResponseMessage("fetched_single", lang),
    data: offer,
  });
});