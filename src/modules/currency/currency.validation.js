import Joi from "joi";
import { generalfields } from "../../utlis/validation/generalfields.js";

const VALID_CURRENCY_CODES = [
  'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'HKD', 'SGD',
  'SEK', 'KRW', 'NOK', 'NZD', 'INR', 'MXN', 'TWD', 'ZAR', 'BRL', 'DKK',
  'PLN', 'THB', 'ILS', 'IDR', 'CZK', 'AED', 'TRY', 'HUF', 'CLP', 'SAR',
  'PHP', 'MYR', 'COP', 'RUB', 'RON', 'PEN', 'BHD', 'BGN', 'ARS', 'EGP',
  'QAR', 'KWD', 'MAD', 'VND', 'UAH', 'NGN', 'BDT', 'PKR', 'DZD', 'LKR',
  'KES', 'OMR', 'JOD', 'LYD', 'GHS', 'CRC', 'UYU', 'PYG', 'BOB', 'SVC',
  'HNL', 'NIO', 'DOP', 'GTQ', 'PAB', 'TTD', 'BBD', 'BZD', 'JMD', 'BSD',
  'BMD', 'KYD', 'XCD', 'AWG', 'ANG', 'SRD', 'BND', 'PGK', 'FJD', 'SBD',
  'VUV', 'WST', 'TOP', 'KHR', 'LAK', 'MNT', 'MMK', 'NPR', 'BTN', 'MVR',
  'MUR', 'SCR', 'DJF', 'ERN', 'SZL', 'LSL', 'GMD', 'GNF', 'MRU', 'STN',
  'CDF', 'RWF', 'TZS', 'UGX', 'BIF', 'MWK', 'ZMW', 'ZWL', 'AOA', 'CVE',
  'XAF', 'XOF', 'XPF', 'FKP', 'GIP', 'SHP', 'SOS', 'SSP', 'TND', 'MZN',
  'ETB', 'SDG', 'CUP', 'IRR', 'IQD', 'SYP', 'YER', 'AFN', 'ALL', 'AMD',
  'AZN', 'BAM', 'BYN', 'GEL', 'ISK', 'MDL', 'MKD', 'RSD', 'TJS', 'TMT',
  'UZS', 'XDR'
];

export const createCurrencySchema = Joi.object({
  code: Joi.string()
    .length(3)
    .uppercase()
    .required()
    .custom((value, helpers) => {
      if (!VALID_CURRENCY_CODES.includes(value)) {
        return helpers.error('any.invalid', { 
          message: `'${value}' is not a valid ISO 4217 currency code` 
        });
      }
      return value;
    })
    .messages({
      "string.length": "Currency code must be exactly 3 characters",
      "any.required": "Currency code is required",
      "any.invalid": "{{#message}}"
    }),
  name: Joi.object({
    en: Joi.string().min(2).max(50).required().trim()
      .messages({
        'string.empty': 'English name is required',
        'any.required': 'English name is required'
      }),
    ar: Joi.string().min(2).max(50).required().trim()
      .messages({
        'string.empty': 'Arabic name is required',
        'any.required': 'Arabic name is required'
      }),
  }).required(),
  symbol: Joi.string().min(1).max(5).required().trim(),
  isDefault: Joi.boolean().default(false),
});

export const updateCurrencySchema = Joi.object({
  id: generalfields._id.required(),
  name: Joi.object({
    en: Joi.string().min(2).max(50).trim(),
    ar: Joi.string().min(2).max(50).trim(),
  }),
  symbol: Joi.string().min(1).max(5).trim(),
  isActive: Joi.boolean(),
  isDefault: Joi.boolean(),
});

export const currencyIdSchema = Joi.object({
  id: generalfields._id.required(),
});

export const toggleStatusSchema = Joi.object({
  id: generalfields._id.required(),
  isActive: Joi.boolean().required(),
});

export const validateCurrencyCode = (code) => {
  return VALID_CURRENCY_CODES.includes(code.toUpperCase());
};