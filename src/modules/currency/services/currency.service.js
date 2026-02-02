import mongoose from "mongoose";
import Currency from "../../../DB/models/Currency.model.js";
import {
  create,
  findAll,
  findById,
  findOne,
  findByIdAndUpdate,
  deleteOne,
  countDocuments,
} from "../../../DB/dbservice.js";
import { validateCurrencyCode } from "../currency.validation.js";
import { getCurrencyErrorMessage } from "../helpers/responseMessages.js";

const throwError = (key, lang, params = {}, status = 400) => {
  const error = new Error(getCurrencyErrorMessage(key, lang, params));
  error.status = status;
  throw error;
};

export const createCurrency = async (data, userId, lang) => {
  if (!validateCurrencyCode(data.code)) {
    throwError("invalid_code", lang, { code: data.code });
  }

  const exists = await findOne({
    model: Currency,
    filter: { code: data.code.toUpperCase() },
  });

  if (exists) {
    throwError("code_exists", lang, { code: data.code });
  }

  return create({
    model: Currency,
    data: {
      ...data,
      code: data.code.toUpperCase(),
      createdBy: userId,
    },
  });
};

export const formatCurrencyForLanguage = (currency, lang) => {
  if (!currency) return null;

  const obj = currency.toObject ? currency.toObject() : { ...currency };

  obj.name =
    currency.name && currency.name[lang]
      ? currency.name[lang]
      : currency.name?.en || currency.code;

  return obj;
};

const formatCurrenciesForLanguage = (currencies, lang) => {
  return currencies.map((currency) =>
    formatCurrencyForLanguage(currency, lang),
  );
};

export const getAllCurrencies = async (filter = {}, options = {}) => {
  const {
    page = 1,
    limit = 10,
    sort = "code",
    order = "asc",
    search,
    isActive,
    lang = "en",
  } = options;

  let query = { ...filter };

  if (isActive !== undefined) {
    query.isActive = isActive === "true";
  }

  if (search) {
    query.$or = [
      { code: { $regex: search, $options: "i" } },
      { "name.en": { $regex: search, $options: "i" } },
      { "name.ar": { $regex: search, $options: "i" } },
      { symbol: { $regex: search, $options: "i" } },
    ];
  }

  const skip = (page - 1) * limit;
  const sortOrder = order === "desc" ? -1 : 1;
  const sortObj = { [sort]: sortOrder };

  const currencies = await findAll({
    model: Currency,
    filter: query,
    skip,
    limit: parseInt(limit),
    sort: sortObj,
    select: "code name symbol isActive isDefault createdAt updatedAt", // Select specific fields
  });

  // Format currencies with language support
  const formattedCurrencies = formatCurrenciesForLanguage(currencies, lang);

  const total = await countDocuments({ model: Currency, filter: query });
  const totalPages = Math.ceil(total / limit);

  return {
    currencies: formattedCurrencies,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
};

export const getCurrencyById = async (id, lang) => {
  const currency = await findById({
    model: Currency,
    id,
    select: "code name symbol isActive isDefault createdAt updatedBy createdBy",
  });

  if (!currency) throwError("not_found", lang, {}, 404);

  return formatCurrencyForLanguage(currency, lang);
};

export const getCurrencyByCode = async (code, lang) => {
  const currency = await findOne({
    model: Currency,
    filter: { code: code.toUpperCase() },
    select: "code name symbol isActive isDefault",
  });

  if (!currency) throwError("not_found", lang, { code }, 404);

  return formatCurrencyForLanguage(currency, lang);
};

export const updateCurrency = async (id, data, userId, lang) => {
  if (data.code && !validateCurrencyCode(data.code)) {
    throwError("invalid_code", lang, { code: data.code });
  }

  if (data.code) {
    const exists = await findOne({
      model: Currency,
      filter: { code: data.code.toUpperCase(), _id: { $ne: id } },
    });
    if (exists) throwError("code_exists", lang, { code: data.code });
  }

  const updateData = {
    ...data,
    updatedBy: userId,
  };

  const currency = await findByIdAndUpdate({
    model: Currency,
    id,
    data: updateData,
    options: { new: true, runValidators: true },
    select: "code name symbol isActive isDefault updatedBy createdBy",
  });

  if (!currency) throwError("not_found", lang, {}, 404);
  return formatCurrencyForLanguage(currency, lang);
};

export const deleteCurrency = async (id, lang) => {
  const currency = await findById({
    model: Currency,
    id,
    select: "code isDefault",
  });

  if (!currency) throwError("not_found", lang, {}, 404);

  if (currency.isDefault) {
    throwError("cannot_delete_default", lang);
  }

  const User = mongoose.model("User");
  const count = await countDocuments({
    model: User,
    filter: { currency: id },
  });

  if (count > 0) {
    throwError("assigned_to_users", lang);
  }

  await deleteOne({ model: Currency, filter: { _id: id } });
};

export const toggleCurrencyStatus = async (id, isActive, userId, lang) => {
  const currency = await findById({
    model: Currency,
    id,
    select: "code isDefault name symbol",
  });

  if (!currency) throwError("not_found", lang, {}, 404);

  if (!isActive && currency.isDefault) {
    throwError("cannot_deactivate_default", lang);
  }

  const updated = await findByIdAndUpdate({
    model: Currency,
    id,
    data: { isActive, updatedBy: userId },
    options: { new: true },
    select: "code name symbol isActive isDefault",
  });

  return formatCurrencyForLanguage(updated, lang);
};

export const validateAndGetCurrency = async (code, lang) => {
  if (!code) throwError("code_required", lang);

  const currency = await findOne({
    model: Currency,
    filter: { code: code.toUpperCase() },
    select: "code name symbol isActive",
  });

  if (!currency) throwError("not_found", lang, { code }, 404);
  if (!currency.isActive) throwError("not_active", lang, { code });

  return formatCurrencyForLanguage(currency, lang);
};

export const getDefaultCurrency = async (lang) => {
  const currency = await findOne({
    model: Currency,
    filter: { isDefault: true, isActive: true },
    select: "code name symbol isActive isDefault",
  });

  if (!currency) throwError("default_not_found", lang, {}, 404);

  return formatCurrencyForLanguage(currency, lang);
};

export const setDefaultCurrency = async (id, userId, lang) => {
  await Currency.updateMany(
    { _id: { $ne: id } },
    { isDefault: false, updatedBy: userId },
  );

  const currency = await findByIdAndUpdate({
    model: Currency,
    id,
    data: { isDefault: true, updatedBy: userId },
    options: { new: true },
    select: "code name symbol isActive isDefault",
  });

  if (!currency) throwError("not_found", lang, {}, 404);

  return formatCurrencyForLanguage(currency, lang);
};

export const getActiveCurrencies = async (lang) => {
  const currencies = await findAll({
    model: Currency,
    filter: { isActive: true },
    sort: { "name.en": 1 },
    select: "code name symbol isDefault",
  });

  return formatCurrenciesForLanguage(currencies, lang);
};


export const validateCurrencyId = async (id, lang) => {
  const currency = await findOne({
    model: Currency,
    filter: { _id: id, isActive: true },
  });

  if (!currency) {
    throwError("invalid", lang, {}, 404);
  }

  return currency;
};


