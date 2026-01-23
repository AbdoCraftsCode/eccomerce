import axios from "axios";

import { supportedCurrencies } from "../../../utlis/currencies/currencyMap.js";

export const convertProductPrices = async (products, countryCode) => {
  try {
    const targetCurrency = countryCode.toUpperCase();

    const isvalid = isValidCurrency(targetCurrency);

    if (!isvalid) {
      return products;  // Skip if invalid, as per original behavior
    }

    const rateCache = {}; // Cache for exchange rates to avoid redundant API calls

    return await Promise.all(
      products.map(async (product) => {
        const productCopy = { ...product };
        const productCurrency = productCopy.currency?.toUpperCase() || "USD";

        if (productCurrency === targetCurrency) {
          return productCopy; // No conversion needed if currencies match
        }

        const cacheKey = `${productCurrency}_${targetCurrency}`;
        let exchangeRate = rateCache[cacheKey];

        if (!exchangeRate) {
          exchangeRate = await getExchangeRate(productCurrency, targetCurrency);
          if (exchangeRate) {
            rateCache[cacheKey] = exchangeRate;
          } else {
            return productCopy;
          }
        }

        if (productCopy.mainPrice) {
          const originalPrice = parseFloat(productCopy.mainPrice);
          if (!isNaN(originalPrice)) {
            productCopy.mainPrice = (originalPrice * exchangeRate)
              .toFixed(2)
              .toString();
          }
        }

        if (productCopy.disCountPrice) {
          const discountPrice = parseFloat(productCopy.disCountPrice);
          if (!isNaN(discountPrice)) {
            productCopy.disCountPrice = (discountPrice * exchangeRate)
              .toFixed(2)
              .toString();
          }
        }

        // Do not convert tax.rate as it's a percentage, not a monetary value
        // Removed the tax rate conversion block

        if (productCopy.hasVariants && productCopy.variants) {
          productCopy.variants = productCopy.variants.map((variant) => {
            const variantCopy = { ...variant };
            if (variantCopy.price) {
              const originalVariantPrice = parseFloat(variantCopy.price);
              if (!isNaN(originalVariantPrice)) {
                variantCopy.price = (originalVariantPrice * exchangeRate)
                  .toFixed(2)
                  .toString();
              }
            }
            if (variantCopy.disCountPrice) {
              const variantDiscountPrice = parseFloat(variantCopy.disCountPrice);
              if (!isNaN(variantDiscountPrice)) {
                variantCopy.disCountPrice = (variantDiscountPrice * exchangeRate)
                  .toFixed(2)
                  .toString();
              }
            }
            return variantCopy;
          });
        }

        productCopy.currency = targetCurrency;

        return productCopy;
      })
    );
  } catch (error) {
    console.error("Currency conversion failed:", error);
    return products;
  }
};

export const getExchangeRate = async (fromCurrency, toCurrency) => {
  const apiEndpoints = [
    {
      name: "ExchangeRate-API",
      url: `https://api.exchangerate-api.com/v4/latest/${fromCurrency}`,
      extractor: (data) => data?.rates?.[toCurrency],
    },
    {
      name: "Frankfurter",
      url: `https://api.frankfurter.app/latest?from=${fromCurrency}&to=${toCurrency}`,
      extractor: (data) => data?.rates?.[toCurrency],
    },
    {
      name: "VatComply",
      url: `https://api.vatcomply.com/rates?base=${fromCurrency}`,
      extractor: (data) => data?.rates?.[toCurrency],
    },
  ];

  for (const api of apiEndpoints) {
    try {
      const response = await axios.get(api.url, { timeout: 5000 });

      if (response.status === 200) {
        const rate = api.extractor(response.data);
        if (rate) {
          console.log(
            `Got rate from ${api.name}: 1 ${fromCurrency} = ${rate} ${toCurrency}`
          );
          return rate;
        }
      }
    } catch (error) {
      console.warn(`${api.name} failed:`, error.message);
    }
  }

  console.error(
    "All exchange rate APIs failed. No conversion will be performed."
  );
  return null;
};

export const isValidCurrency = (currency) => {
  if (!currency) return false;

  return supportedCurrencies.has(currency.toUpperCase());
};