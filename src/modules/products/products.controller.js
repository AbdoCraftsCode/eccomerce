import { asyncHandelr } from "../../utlis/response/error.response.js";
import * as productsService from "./services/products.service.js";
import { getResponseMessage } from "./helpers/responseMessages.js";
import { getUserLanguage } from "../../utlis/localization/langUserHelper.js";


export const getProducts = asyncHandelr(async (req, res) => {
  const lang = getUserLanguage(req);
  const userCurrency = req.user?.currency || { code: "USD", name: { en: "US Dollar", ar: "دولار أمريكي" }, symbol: "$" };

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

/**
 * Get product by ID
 */
export const getProductById = asyncHandelr(async (req, res) => {
  const lang = getUserLanguage(req);
  const userCurrency = req.user?.currency || { code: "USD", name: { en: "US Dollar", ar: "دولار أمريكي" }, symbol: "$" };

  const product = await productsService.getProductById(req.params.productId, userCurrency, lang);

  res.status(200).json({
    success: true,
    message: getResponseMessage("product_fetched", lang),
    data: product,
  });
});
