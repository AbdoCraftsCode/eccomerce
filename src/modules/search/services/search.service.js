import { asyncHandelr } from "../../../utlis/response/error.response.js";
import { ProductModellll } from "../../../DB/models/productSchemaaaa.js";
import { CategoryModellll } from "../../../DB/models/categorySchemaaa.js";
import { BrandModel } from "../../../DB/models/brandSchemaaa.js";

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

  return categories.map((cat) => ({
    _id: cat._id,
    name: cat.name,
    description: cat.description,
    images: cat.images || [],
    status: cat.status,
    displayName: cat.name?.[lang] || cat.name?.en || "",
    displayDescription: cat.description?.[lang] || cat.description?.en || "",
  }));
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
    displayName: brand.name?.[lang] || brand.name?.en || "",
    displayDescription:
      brand.description?.[lang] || brand.description?.en || "",
  }));
};

export const searchProducts = asyncHandelr(async (req, res, next) => {
  const { q, page = 1, limit = 20, lang = "en" } = req.query;

  if (!q || q.trim() === "") {
    return res.status(200).json({
      success: true,
      results: 0,
      page: Number(page),
      limit: Number(limit),
      total: 0,
      data: [],
      matches: { categories: [], brands: [] },
    });
  }

  const searchTerm = q.trim();
  const searchPatterns = createSearchPatterns(searchTerm);

  try {
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

    const [products, total] = await Promise.all([
      ProductModellll.find(query)
        .select(
          "_id name description images mainPrice disCountPrice currency stock inStock hasVariants rating weight",
        )
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit))
        .sort({ createdAt: -1 })
        .lean(),
      ProductModellll.countDocuments(query),
    ]);

    const formattedProducts = products.map((product) => ({
      _id: product._id,
      name: product.name,
      description: product.description,
      images: product.images || [],
      mainPrice: product.mainPrice,
      disCountPrice: product.disCountPrice,
      currency: product.currency,
      stock: product.stock,
      inStock: product.inStock,
      hasVariants: product.hasVariants,
      rating: product.rating,
      weight: product.weight,
    }));

    res.status(200).json({
      success: true,
      results: formattedProducts.length,
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / limit),
      searchTerm,
      matches: {
        categories: matchingCategories.map((cat) => ({
          _id: cat._id,
          name: cat.name,
          description: cat.description,
          images: cat.images,
          status: cat.status,
          displayName: cat.displayName,
          displayDescription: cat.displayDescription,
        })),
        brands: matchingBrands.map((brand) => ({
          _id: brand._id,
          name: brand.name,
          description: brand.description,
          logo: brand.logo,
          status: brand.status,
          displayName: brand.displayName,
          displayDescription: brand.displayDescription,
        })),
      },
      data: formattedProducts,
      searchMeta: {
        term: searchTerm,
        language: lang,
        hasMatches: matchingCategories.length > 0 || matchingBrands.length > 0,
        totalMatches: matchingCategories.length + matchingBrands.length,
      },
    });
  } catch (error) {
    console.error("Search error:", error);
    return res.status(500).json({
      success: false,
      message: "Search failed. Please try again.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});
