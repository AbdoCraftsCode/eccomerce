import { asyncHandelr } from "../../utlis/response/error.response.js";
import * as sliderService from "./services/slider.service.js";
import { getResponseMessage } from "./helpers/responseMessages.js";
import { getUserLanguage } from "../../utlis/localization/langUserHelper.js";

export const createSlider = asyncHandelr(async (req, res) => {
  const lang = getUserLanguage(req);
  const slider = await sliderService.createSlider(req, lang);

  res.status(201).json({
    success: true,
    message: getResponseMessage("created", lang),
    data: slider,
  });
});

export const updateSlider = asyncHandelr(async (req, res) => {
  const lang = getUserLanguage(req);
  const slider = await sliderService.updateSlider(req, lang);

  res.status(200).json({
    success: true,
    message: getResponseMessage("updated", lang),
    data: slider,
  });
});

export const deleteSlider = asyncHandelr(async (req, res) => {
  const lang = getUserLanguage(req);
  await sliderService.deleteSlider(req, lang);

  res.status(200).json({
    success: true,
    message: getResponseMessage("deleted", lang),
  });
});

export const getSliders = asyncHandelr(async (req, res) => {
  const lang = getUserLanguage(req);
  const result = await sliderService.getSliders(req, lang);

  res.status(200).json({
    success: true,
    message: getResponseMessage("fetched", lang),
    data: result,
  });
});