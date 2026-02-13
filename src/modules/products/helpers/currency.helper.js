import { getExchangeRate } from "../../auth/service/changeCurrencyHelper.service.js";
import { throwError } from "./responseMessages.js";

/**
 * Convert single product prices with provided exchange rate
 */
const convertProductWithRate = (product, targetCurrency, exchangeRate) => {
  const productCopy = JSON.parse(JSON.stringify(product));

  // Convert product prices
  if (productCopy.mainPrice) {
    productCopy.mainPrice = parseFloat((productCopy.mainPrice * exchangeRate).toFixed(2));
  }

  if (productCopy.disCountPrice) {
    productCopy.disCountPrice = parseFloat((productCopy.disCountPrice * exchangeRate).toFixed(2));
  }

  // Convert variant prices
  if (productCopy.variants && Array.isArray(productCopy.variants)) {
    productCopy.variants = productCopy.variants.map((variant) => {
      const variantCopy = { ...variant };

      if (variantCopy.price) {
        variantCopy.price = parseFloat((variantCopy.price * exchangeRate).toFixed(2));
      }

      if (variantCopy.disCountPrice) {
        const discountPrice = parseFloat(variantCopy.disCountPrice);
        if (!isNaN(discountPrice)) {
          variantCopy.disCountPrice = parseFloat((discountPrice * exchangeRate).toFixed(2));
        }
      }

      return variantCopy;
    });
  }

  productCopy.currency = targetCurrency;
  return productCopy;
};

/**
 * Convert product prices to target currency
 */
export const convertProductPricesToCurrency = async (product, targetCurrency, exchangeRate = null) => {
  if (!product || !targetCurrency) return product;

  const targetCurrencyCode = targetCurrency.code?.toUpperCase() || "USD";
  const productCurrencyCode = product.currency?.code?.toUpperCase();

  if (!productCurrencyCode) {
    return null; // Product will be filtered out
  }

  // Same currency, no conversion needed
  if (productCurrencyCode === targetCurrencyCode) {
    const productCopy = JSON.parse(JSON.stringify(product));
    productCopy.currency = targetCurrency;
    return productCopy;
  }

  // Use provided exchange rate or fetch new one
  let rate = exchangeRate;
  if (!rate) {
    rate = await getExchangeRate(productCurrencyCode, targetCurrencyCode);
  }

  if (!rate) {
    return null; // Product will be filtered out if no exchange rate available
  }

  return convertProductWithRate(product, targetCurrency, rate);
};

/**
 * Convert multiple products with exchange rate caching
 */
export const convertProductsArrayToCurrency = async (products, targetCurrency, lang = "en") => {
  if (!products || !Array.isArray(products) || products.length === 0) {
    return products;
  }

  const targetCurrencyCode = targetCurrency.code?.toUpperCase() || "USD";

  // Filter products with currency
  const productsWithCurrency = products.filter(product => product.currency);

  const productsByCurrency = {};
  productsWithCurrency.forEach((product) => {
    const currencyCode = product.currency.code?.toUpperCase();
    if (currencyCode) {
      if (!productsByCurrency[currencyCode]) {
        productsByCurrency[currencyCode] = [];
      }
      productsByCurrency[currencyCode].push(product);
    }
  });

  const exchangeRatesCache = {};
  const currencyCodes = Object.keys(productsByCurrency);

  for (const currencyCode of currencyCodes) {
    if (currencyCode !== targetCurrencyCode) {
      const rate = await getExchangeRate(currencyCode, targetCurrencyCode);
      if (!rate) {
        throwError("currency_conversion_technical_issue", lang, {}, 503);
      }
      exchangeRatesCache[currencyCode] = rate;
    }
  }

  const converted = [];
  for (const [currencyCode, currencyProducts] of Object.entries(productsByCurrency)) {
    const rate = currencyCode === targetCurrencyCode ? 1 : exchangeRatesCache[currencyCode];

    for (const product of currencyProducts) {
      if (currencyCode === targetCurrencyCode) {
        const productCopy = JSON.parse(JSON.stringify(product));
        productCopy.currency = targetCurrency;
        converted.push(productCopy);
      } else {
        const convertedProduct = convertProductWithRate(product, targetCurrency, rate);
        converted.push(convertedProduct);
      }
    }
  }

  return converted;
};

export const convertPrice = async (price, fromCurrency, toCurrency) => {
  if (!price || !fromCurrency || !toCurrency) return price;

  const fromCode = fromCurrency.toUpperCase();
  const toCode = toCurrency.toUpperCase();

  if (fromCode === toCode) return price;

  const exchangeRate = await getExchangeRate(fromCode, toCode);
  if (!exchangeRate) return price;

  return parseFloat((price * exchangeRate).toFixed(2));
};
