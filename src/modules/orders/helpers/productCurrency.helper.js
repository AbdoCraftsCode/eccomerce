import { getExchangeRate } from "../../auth/service/changeCurrencyHelper.service.js";

export const convertToUSD = async (amount, fromCurrency) => {
  if (!amount || isNaN(parseFloat(amount))) return 0;

  const from = (fromCurrency || "USD").toUpperCase();
  if (from === "USD") {
    return Number(parseFloat(amount).toFixed(6));
  }

  const rate = await getExchangeRate(from, "USD"); // rate = how many USD per 1 unit of fromCurrency

  if (rate === null || rate <= 0) {
    throw new Error(`Failed to get exchange rate from ${from} to USD`);
  }

  const usdValue = parseFloat(amount) * rate;  

  return Number(usdValue.toFixed(6));
};