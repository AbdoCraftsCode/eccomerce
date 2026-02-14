import { asyncHandelr } from "../../utlis/response/error.response.js";
import * as productsService from "./services/products.service.js";
import { getResponseMessage } from "./helpers/responseMessages.js";
import { getUserLanguage } from "../../utlis/localization/langUserHelper.js";
import { getCurrencyByCode } from "../currency/services/currency.service.js";


export const getProducts = asyncHandelr(async (req, res) => {
  const lang = getUserLanguage(req);
  
  let currencyCode = "USD";
  if (req.user?.currency) {
    currencyCode = req.user.currency.code || req.user.currency;
    if (typeof currencyCode !== 'string') currencyCode = "USD"; 
  }

  let userCurrency;
  try {
    userCurrency = await getCurrencyByCode(currencyCode, lang);
    console.log(userCurrency)
  } catch (error) {
    userCurrency = { code: "USD", name: lang==='ar' ? "دولار أمريكي" : "US Dollar", symbol: "$" };
  }

  const filters = {
    categoryId: req.query.categoryId,
    subCategoryId: req.query.subCategoryId,
    brandId: req.query.brandId,
    minPrice: req.query.minPrice,
    maxPrice: req.query.maxPrice,
    search: req.query.search,
    page: req.query.page,
    limit: req.query.limit,
  };

  const result = await productsService.getProductsWithFilters(filters, userCurrency, lang);

  res.status(200).json({
    success: true,
    message: getResponseMessage("products_fetched", lang),
    data: result.data,
    pagination: result.pagination,
  });
});

export const getProductById = asyncHandelr(async (req, res) => {
  const lang = getUserLanguage(req);
  
  let currencyCode = "USD";
  if (req.user?.currency) {
    currencyCode = req.user.currency.code || req.user.currency;
    if (typeof currencyCode !== 'string') currencyCode = "USD";
  }

  let userCurrency;
  try {
      userCurrency = await getCurrencyByCode(currencyCode, lang);
  } catch (error) {
      userCurrency = { code: "USD", name: lang==='ar' ? "دولار أمريكي" : "US Dollar", symbol: "$" };
  }

  const product = await productsService.getProductById(req.params.productId, userCurrency, lang);

  res.status(200).json({
    success: true,
    message: getResponseMessage("product_fetched", lang),
    data: product,
  });
});
