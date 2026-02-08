import { asyncHandelr } from "../../utlis/response/error.response.js";
import * as currencyService from "./services/currency.service.js";
import { getResponseMessage } from "./helpers/responseMessages.js";
import { getUserLanguage } from "../../utlis/localization/langUserHelper.js";

export const createCurrency = asyncHandelr(async (req, res) => {
  const lang = getUserLanguage(req);
  const currency = await currencyService.createCurrency(
    req.body,
    req.user._id,
    lang,
  );

  res.status(201).json({
    success: true,
    message: getResponseMessage("created", lang),
    data: currency,
  });
});

export const getAllCurrencies = asyncHandelr(async (req, res, next) => {
  const { page, limit, sort, order, search, isActive } = req.query;

  const result = await currencyService.getAllCurrencies(
    {},
    { page, limit, sort, order, search, isActive , lang:"en" },
  );

  res.status(200).json({
    success: true,
    message: getResponseMessage("fetched", "en"),
    data: result.currencies,
    pagination: result.pagination,
  });
});

export const getCurrencyById = asyncHandelr(async (req, res) => {
  const currency = await currencyService.getCurrencyById(req.params.id, "en");

  res.status(200).json({
    success: true,
    message: getResponseMessage("fetched_single", "en"),
    data: currency,
  });
});

export const updateCurrency = asyncHandelr(async (req, res) => {
  const lang = getUserLanguage(req);
  const currency = await currencyService.updateCurrency(
    req.params.id,
    req.body,
    req.user._id,
    lang,
  );

  res.status(200).json({
    success: true,
    message: getResponseMessage("updated", lang),
    data: currency,
  });
});

export const deleteCurrency = asyncHandelr(async (req, res) => {
  const lang = getUserLanguage(req);
  await currencyService.deleteCurrency(req.params.id, lang);

  res.status(200).json({
    success: true,
    message: getResponseMessage("deleted", lang),
  });
});

export const toggleCurrencyStatus = asyncHandelr(async (req, res) => {
  const lang = getUserLanguage(req);
  const { isActive } = req.body;

  const currency = await currencyService.toggleCurrencyStatus(
    req.params.id,
    isActive,
    req.user._id,
    lang,
  );

  res.status(200).json({
    success: true,
    message: getResponseMessage(isActive ? "activated" : "deactivated", lang),
    data: currency,
  });
});

export const getDefaultCurrency = asyncHandelr(async (req, res) => {
  const currency = await currencyService.getDefaultCurrency("en");

  res.status(200).json({
    success: true,
    message: getResponseMessage("default_fetched", "en"),
    data: currency,
  });
});

export const setDefaultCurrency = asyncHandelr(async (req, res) => {
  const lang = getUserLanguage(req);
  const currency = await currencyService.setDefaultCurrency(
    req.params.id,
    req.user._id,
    lang,
  );

  res.status(200).json({
    success: true,
    message: getResponseMessage("default_set", lang),
    data: currency,
  });
});

export const getActiveCurrencies = asyncHandelr(async (req, res) => {
  const lang = getUserLanguage(req);
  const currencies = await currencyService.getActiveCurrencies("en");

  res.status(200).json({
    success: true,
    message: getResponseMessage("active_fetched", "en"),
    data: currencies,
  });
});

export const validateCurrency = asyncHandelr(async (req, res) => {
  const { code } = req.query;

  const currency = await currencyService.validateAndGetCurrency(code, "en");

  res.status(200).json({
    success: true,
    message: getResponseMessage("valid", "en"),
    data: currency,
  });
});
