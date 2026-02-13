export const localizeField = (field, lang = "en") => {
  if (!field) return "";
  if (typeof field === "string") return field;
  return field[lang] || field.en || "";
};


export const localizeProduct = (product, lang = "en") => {
  if (!product) return product;

  const localized = { ...product };

  if (localized.name) {
    localized.name = localizeField(localized.name, lang);
  }
  if (localized.description) {
    localized.description = localizeField(localized.description, lang);
  }

  if (localized.categories && Array.isArray(localized.categories)) {
    localized.categories = localized.categories.map((cat) => ({
      ...cat,
      name: localizeField(cat.name, lang),
      description: localizeField(cat.description, lang),
    }));
  }

  if (localized.brands && Array.isArray(localized.brands)) {
    localized.brands = localized.brands.map((brand) => ({
      ...brand,
      name: localizeField(brand.name, lang),
    }));
  }

  if (localized.currency) {
    localized.currency = {
      ...localized.currency,
      name: localizeField(localized.currency.name, lang),
    };
  }

  if (localized.variants && Array.isArray(localized.variants)) {
    localized.variants = localized.variants.map((variant) => ({
      ...variant,
      attributes: variant.attributes?.map((attr) => ({
        ...attr,
        attributeName: localizeField(attr.attributeName, lang),
        valueName: localizeField(attr.valueName, lang),
      })) || [],
    }));
  }

  return localized;
};


export const localizeProducts = (products, lang = "en") => {
  if (!products || !Array.isArray(products)) return products;
  return products.map((product) => localizeProduct(product, lang));
};
