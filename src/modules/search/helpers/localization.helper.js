export const localizeField = (field, lang = "en") => {
  if (!field) return "";
  if (typeof field === "string") return field;
  return field[lang] || field.en || "";
};

export const localizeSearchProduct = (product, lang = "en") => {
  if (!product) return product;

  return {
    _id: product._id,
    name: localizeField(product.name, lang),
    description: localizeField(product.description, lang),
    images: product.images || [],
    stock: product.stock,
    inStock: product.inStock,
    hasVariants: product.hasVariants,
    rating: product.rating,
  };
};

export const localizeSearchCategory = (category, lang = "en") => {
  if (!category) return category;

  return {
    _id: category._id,
    name: localizeField(category.name, lang),
    description: localizeField(category.description, lang),
    images: category.images || [],
    status: category.status,
  };
};

export const localizeSearchBrand = (brand, lang = "en") => {
  if (!brand) return brand;

  return {
    _id: brand._id,
    name: localizeField(brand.name, lang),
    description: localizeField(brand.description, lang),
    logo: brand.logo,
    status: brand.status,
  };
};

export const localizeSearchResults = (results, lang = "en") => {
  if (!results) return results;

  return {
    products: results.products?.map((p) => localizeSearchProduct(p, lang)) || [],
    categories: results.categories?.map((c) => localizeSearchCategory(c, lang)) || [],
    brands: results.brands?.map((b) => localizeSearchBrand(b, lang)) || [],
  };
};
