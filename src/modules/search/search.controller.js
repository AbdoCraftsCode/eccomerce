import { asyncHandelr } from "../../utlis/response/error.response.js";
import { searchProductsService } from "./services/search.service.js";
import { getResponseMessage } from "./helpers/responseMessages.js";
import { getUserLanguage } from "../../utlis/localization/langUserHelper.js";

export const searchProducts = asyncHandelr(async (req, res) => {
  const lang = getUserLanguage(req);
  const { q, page = 1, limit = 20 } = req.query;

  const userId = req.user._id;
  const userRole = req.user.accountType.toLowerCase();

  const result = await searchProductsService(
    q,
    userId,
    userRole,
    page,
    limit,
    lang
  );

  const message =
    result.products.length > 0
      ? getResponseMessage("search_completed", lang)
      : getResponseMessage("no_results_found", lang);

  res.status(200).json({
    success: true,
    message,
    data: {
      products: result.products,
      matches: {
        categories: result.categories,
        brands: result.brands,
      },
    },
    pagination: result.pagination,
    searchMeta: result.searchMeta,
  });
});