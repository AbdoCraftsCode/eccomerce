import axios from "axios";

import { supportedCurrencies } from "../../../utlis/currencies/currencyMap.js";

export const convertProductPrices = async (products, countryCode) => {
  try {
    const targetCurrency = countryCode.toUpperCase() ;

    const isvalid = isValidCurrency(targetCurrency);

    if (targetCurrency.toUpperCase() === "USD" ||!isvalid) {
      return products;
    }

    const exchangeRate = await getExchangeRate("USD", targetCurrency);

    if (!exchangeRate) {
      return products;
    }

    return products.map((product) => {
      const productCopy = { ...product };
      const productCurrency = productCopy.currency?.toUpperCase() || "USD";

      if (productCurrency === "USD") {
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

        if (productCopy.tax?.enabled === true && productCopy.tax?.rate) {
          const taxRate = parseFloat(productCopy.tax.rate);
          if (!isNaN(taxRate)) {
            productCopy.tax = {
              ...productCopy.tax,
              rate: parseFloat((taxRate * exchangeRate).toFixed(2)),
            };
          }
        }

        if (productCopy.hasVariants && productCopy.variants) {
          productCopy.variants = productCopy.variants.map((variant) => ({
            ...variant,
            price: variant.price
              ? parseFloat((variant.price * exchangeRate).toFixed(2))
              : variant.price,
          }));
        }

        productCopy.currency = targetCurrency.toUpperCase();
      }

      return productCopy;
    });
  } catch (error) {
    console.error("Currency conversion failed:", error);
    return products;
  }
};

const getCurrencyCode = (countryCode) => {
  const normalizedCode = countryCode.toUpperCase();
  return currencyMap[normalizedCode] || "USD";
};

const getExchangeRate = async (fromCurrency, toCurrency) => {
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

