import mongoose from "mongoose";
import Country from "../../../DB/models/Country.model.js";
import {
  create,
  findAll,
  findById,
  findOne,
  findByIdAndUpdate,
  deleteOne,
  countDocuments,
} from "../../../DB/dbservice.js";
import { getCountryDataFromApi } from "../helpers/countryCode.js";
import { throwError } from "../helpers/responseMessages.js";


export const formatCountryForLanguage = (country, lang) => {
  if (!country) return null;

  const obj = country.toObject ? country.toObject() : { ...country };
  obj.name =
    country.name && country.name[lang]
      ? country.name[lang]
      : country.name?.en;

  return obj;
};

export const createCountry = async (data, userId, lang) => {
  const { phoneCode, flag } = await getCountryDataFromApi(data.name.en, lang);

  const exists = await findOne({
    model: Country,
    filter: { "name.en": data.name.en },
  });

  if (exists) {
    throwError("name_exists", lang, { name: data.name[lang]||"en" });
  }

  return create({
    model: Country,
    data: {
      name: data.name,
      phoneCode,
      flag,
      isDefault:data.isDefault,
      createdBy: userId,
    },
  });
  

};



const formatCountriesForLanguage = (countries, lang) => {
  return countries.map((country) =>
    formatCountryForLanguage(country, lang),
  );
};

export const getAllCountries = async (filter = {}, options = {}) => {
  const {
    page = 1,
    limit = 10,
    sort = "name.en",
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
      { "name.en": { $regex: search, $options: "i" } },
      { "name.ar": { $regex: search, $options: "i" } },
      { phoneCode: { $regex: search, $options: "i" } },
    ];
  }

  const skip = (page - 1) * limit;
  const sortOrder = order === "desc" ? -1 : 1;
  const sortObj = { [sort]: sortOrder };

  const countries = await findAll({
    model: Country,
    filter: query,
    skip,
    limit: parseInt(limit),
    sort: sortObj,
    select: "name phoneCode flag isActive isDefault createdAt updatedAt",
  });

  const formattedCountries = formatCountriesForLanguage(countries, lang);

  const total = await countDocuments({ model: Country, filter: query });
  const totalPages = Math.ceil(total / limit);

  return {
    countries: formattedCountries,
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

export const getCountryById = async (id, lang) => {
  const country = await findById({
    model: Country,
    id,
    select: "name phoneCode flag isActive isDefault createdAt updatedBy createdBy",
  });

  if (!country) throwError("not_found", lang, {}, 404);

  return formatCountryForLanguage(country, lang);
};


export const deleteCountry = async (id, lang) => {
  const country = await findById({
    model: Country,
    id,
    select: "name isDefault",
  });

  if (!country) throwError("not_found", lang, {}, 404);

  if (country.isDefault) {
    throwError("cannot_delete_default", lang);
  }

  const User = mongoose.model("User");
  const count = await countDocuments({
    model: User,
    filter: { country: id },
  });

  if (count > 0) {
    throwError("assigned_to_users", lang);
  }

  await deleteOne({ model: Country, filter: { _id: id } });
};

export const toggleCountryStatus = async (id, isActive, userId, lang) => {
  const country = await findById({
    model: Country,
    id,
    select: "name isDefault phoneCode flag",
  });

  if (!country) throwError("not_found", lang, {}, 404);

  if (!isActive && country.isDefault) {
    throwError("cannot_deactivate_default", lang);
  }

  const updated = await findByIdAndUpdate({
    model: Country,
    id,
    data: { isActive, updatedBy: userId },
    options: { new: true },
    select: "name phoneCode flag isActive isDefault",
  });

  return formatCountryForLanguage(updated, lang);
};

export const validateAndGetCountry = async (phoneCode, lang) => {
  if (!phoneCode) throwError("code_required", lang);

  const country = await findOne({
    model: Country,
    filter: { phoneCode },
    select: "name phoneCode flag isActive",
  });

  if (!country) throwError("not_found", lang, {}, 404);
  if (!country.isActive) throwError("not_active", lang, { name: country.name.en });

  return formatCountryForLanguage(country, lang);
};

export const getDefaultCountry = async (lang) => {
  const country = await findOne({
    model: Country,
    filter: { isDefault: true, isActive: true },
    select: "name phoneCode flag isActive isDefault",
  });

  if (!country) throwError("default_not_found", lang, {}, 404);

  return formatCountryForLanguage(country, lang);
};

export const setDefaultCountry = async (id, userId, lang) => {
  await Country.updateMany(
    { _id: { $ne: id } },
    { isDefault: false, updatedBy: userId },
  );

  const country = await findByIdAndUpdate({
    model: Country,
    id,
    data: { isDefault: true, updatedBy: userId },
    options: { new: true },
    select: "name phoneCode flag isActive isDefault",
  });

  if (!country) throwError("not_found", lang, {}, 404);

  return formatCountryForLanguage(country, lang);
};

export const getActiveCountries = async (lang) => {
  const countries = await findAll({
    model: Country,
    filter: { isActive: true },
    sort: { "name.en": 1 },
    select: "name phoneCode flag isDefault",
  });

  return formatCountriesForLanguage(countries, lang);
};


export const validateCountryId = async (id, lang) => {
  const country = await findOne({
    model: Country,
    filter: { _id: id, isActive: true },
  });

  if (!country) {
    throwError("invalid_country", lang, {}, 404);
  }

  return country; 
};