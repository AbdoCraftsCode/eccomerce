import { ProductModellll } from "../../../DB/models/productSchemaaaa.js";
import { CategoryModellll } from "../../../DB/models/categorySchemaaa.js";
import { BrandModel } from "../../../DB/models/brandSchemaaa.js";
import { throwError } from "../helpers/responseMessages.js";
import { localizeSearchResults } from "../helpers/localization.helper.js";

const createSearchPatterns = (searchTerm) => {
  const cleanTerm = searchTerm.trim();
  const terms = cleanTerm
    .toLowerCase()
    .split(/\s+/)
    .filter((term) => term.length > 0);
  const patterns = [new RegExp(`^${cleanTerm}$`, "i")];

  terms.forEach((term) => {
    if (term.length > 2) {
      patterns.push(new RegExp(`\\b${term}\\b`, "i"));
      patterns.push(new RegExp(term, "i"));

      if (term.length > 3) {
        for (let i = 3; i <= term.length; i++) {
          patterns.push(new RegExp(term.substring(0, i), "i"));
        }
      }
    } else {
      patterns.push(new RegExp(term, "i"));
    }
  });

  return [...new Set(patterns)];
};

const searchCategories = async (searchPatterns, lang) => {
  const categoryConditions = searchPatterns.map((pattern) => ({
    $or: [
      { "name.en": { $regex: pattern } },
      { "name.ar": { $regex: pattern } },
      { "description.en": { $regex: pattern } },
      { "description.ar": { $regex: pattern } },
    ],
  }));

  const categories = await CategoryModellll.find({
    isActive: true,
    status: "published",
    $or: categoryConditions,
  })
    .select("_id name description images status")
    .lean();

  return categories;
};

const searchBrands = async (searchPatterns, lang) => {
  const brandConditions = searchPatterns.map((pattern) => ({
    $or: [
      { "name.en": { $regex: pattern } },
      { "name.ar": { $regex: pattern } },
      { "description.en": { $regex: pattern } },
      { "description.ar": { $regex: pattern } },
    ],
  }));

  const brands = await BrandModel.find({
    isActive: true,
    $or: brandConditions,
  })
    .select("_id name description image status")
    .lean();

  return brands.map((brand) => ({
    _id: brand._id,
    name: brand.name,
    description: brand.description,
    logo: brand.image?.url || "",
    status: brand.status,
  }));
};

export const searchProductsService = async (
  searchTerm,
  userId,
  userRole,
  page = 1,
  limit = 20,
  lang = "en"
) => {
  if (!searchTerm || searchTerm.trim() === "") {
    throwError("search_term_required", lang, {}, 400);
  }

  const cleanSearchTerm = searchTerm.trim();
  const searchPatterns = createSearchPatterns(cleanSearchTerm);

  const [matchingCategories, matchingBrands] = await Promise.all([
    searchCategories(searchPatterns, lang),
    searchBrands(searchPatterns, lang),
  ]);

  const matchingCategoryIds = matchingCategories.map((cat) => cat._id);
  const matchingBrandIds = matchingBrands.map((brand) => brand._id);

  const orConditions = [];

  searchPatterns.forEach((pattern) => {
    orConditions.push({ "name.en": { $regex: pattern } });
    orConditions.push({ "name.ar": { $regex: pattern } });
    orConditions.push({ "description.en": { $regex: pattern } });
    orConditions.push({ "description.ar": { $regex: pattern } });
    orConditions.push({ tags: { $regex: pattern } });
    orConditions.push({ sku: { $regex: pattern } });
  });

  if (matchingCategoryIds.length > 0) {
    orConditions.push({ categories: { $in: matchingCategoryIds } });
  }

  if (matchingBrandIds.length > 0) {
    orConditions.push({ brands: { $in: matchingBrandIds } });
  }

  const query = {
    $or: orConditions,
    isActive: true,
    status: "published",
  };

  // Role-based filtering: vendors only see their own products
  if (userRole === "vendor") {
    query.createdBy = userId;
  }
  // Admins see all products (no additional filter needed)

  const [products, total] = await Promise.all([
    ProductModellll.find(query)
      .select(
        "_id name description images stock inStock hasVariants rating"
      )
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .sort({ createdAt: -1 })
      .lean(),
    ProductModellll.countDocuments(query),
  ]);

  // Localize all results
  const localizedResults = localizeSearchResults(
    {
      products,
      categories: matchingCategories,
      brands: matchingBrands,
    },
    lang
  );

  return {
    products: localizedResults.products,
    categories: localizedResults.categories,
    brands: localizedResults.brands,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
    },
    searchMeta: {
      term: cleanSearchTerm,
      language: lang,
      role: userRole,
      resultsCount: localizedResults.products.length,
    },
  };
};
