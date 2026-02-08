import { asyncHandelr } from "../../utlis/response/error.response.js";
import * as countryService from "./services/country.service.js";
import { getResponseMessage } from "./helpers/responseMessages.js";
import { getUserLanguage } from "../../utlis/localization/langUserHelper.js";

export const createCountry = asyncHandelr(async (req, res) => {
  const lang = getUserLanguage(req);
  const country = await countryService.createCountry(
    req.body,
    req.user._id,
    lang,
  );

  res.status(201).json({
    success: true,
    message: getResponseMessage("created", lang),
    data: country,
  });
});

export const getAllCountries = asyncHandelr(async (req, res, next) => {
  const { page, limit, sort, order, search, isActive } = req.query;

  const result = await countryService.getAllCountries(
    {},
    { page, limit, sort, order, search, isActive , lang:"en"},
  );

  res.status(200).json({
    success: true,
    message: getResponseMessage("fetched", "en"),
    data: result.countries,
    pagination: result.pagination,
  });
});

export const getCountryById = asyncHandelr(async (req, res) => {
  const country = await countryService.getCountryById(req.params.id , "en");

  res.status(200).json({
    success: true,
    message: getResponseMessage("fetched_single", "en"),
    data: country,
  });
});


export const deleteCountry = asyncHandelr(async (req, res) => {
  const lang = getUserLanguage(req);
  await countryService.deleteCountry(req.params.id, lang);

  res.status(200).json({
    success: true,
    message: getResponseMessage("deleted", lang),
  });
});

export const toggleCountryStatus = asyncHandelr(async (req, res) => {
  const lang = getUserLanguage(req);
  const { isActive } = req.body;

  const country = await countryService.toggleCountryStatus(
    req.params.id,
    isActive,
    req.user._id,
    lang,
  );

  res.status(200).json({
    success: true,
    message: getResponseMessage(isActive ? "activated" : "deactivated", lang),
    data: country,
  });
});

export const getDefaultCountry = asyncHandelr(async (req, res) => {
  const country = await countryService.getDefaultCountry("en");

  res.status(200).json({
    success: true,
    message: getResponseMessage("default_fetched", "en"),
    data: country,
  });
});

export const setDefaultCountry = asyncHandelr(async (req, res) => {
  const lang = getUserLanguage(req);
  const country = await countryService.setDefaultCountry(
    req.params.id,
    req.user._id,
    lang,
  );

  res.status(200).json({
    success: true,
    message: getResponseMessage("default_set", lang),
    data: country,
  });
});

export const getActiveCountries = asyncHandelr(async (req, res) => {
  const countries = await countryService.getActiveCountries("en");

  res.status(200).json({
    success: true,
    message: getResponseMessage("active_fetched", "en"),
    data: countries,
  });
});

export const validateCountry = asyncHandelr(async (req, res) => {
  const { phoneCode } = req.query;

  const country = await countryService.validateAndGetCountry(phoneCode);

  res.status(200).json({
    success: true,
    message: getResponseMessage("valid", "en"),
    data: country,
  });
});