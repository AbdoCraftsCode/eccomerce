import { ProductModellll } from "../../../DB/models/productSchemaaaa.js";
import { VariantModel } from "../../../DB/models/variantSchema.js";
import { convertProductsArrayToCurrency, convertProductPricesToCurrency } from "../helpers/currency.helper.js";
import { throwError } from "../helpers/responseMessages.js";
import { findAll, updateOne } from "../../../DB/dbservice.js";
import { localizeProducts, localizeProduct } from "../helpers/localization.helper.js";


export const getProductsWithFilters = async (filters, userCurrency, lang = "en") => {
  const {
    categoryId,
    subCategoryId,
    brandId,
    minPrice,
    maxPrice,
    search,
    page = 1,
    limit = 20,
  } = filters;

  const query = { isActive: true, status: "published" };

  const categoryIds = [];
  if (categoryId) {
    categoryIds.push(categoryId);
  }
  if (subCategoryId) {
    categoryIds.push(subCategoryId);
  }
  if (categoryIds.length > 0) {
    query.categories = { $in: categoryIds };
  }

  if (brandId) {
    query.brands = brandId;
  }

  if (search) {
    query.$or = [
      { "name.en": { $regex: search, $options: "i" } },
      { "name.ar": { $regex: search, $options: "i" } },
      { "description.en": { $regex: search, $options: "i" } },
      { "description.ar": { $regex: search, $options: "i" } },
    ];
  }

  if (minPrice !== undefined && maxPrice !== undefined) {
    if (parseFloat(minPrice) > parseFloat(maxPrice)) {
      throwError("invalid_price_range", lang, {}, 400);
    }
  }

  const skip = (page - 1) * limit;

  let products = await ProductModellll.find(query)
    .populate("currency", "code name symbol")
    .populate("categories", "name slug")
    .populate("brands", "name slug")
    .populate("createdBy", "fullName")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .lean();

  const productsWithVariants = await Promise.all(
    products.map(async (product) => {
      if (product.hasVariants) {
        const variants = await VariantModel.find({
          productId: product._id,
          isActive: true,
        })
          .populate({
            path: "attributes.attributeId",
            select: "name",
          })
          .populate({
            path: "attributes.valueId",
            select: "name hexCode",
          })
          .lean();

        product.variants = variants.map((variant) => ({
          ...variant,
          attributes: variant.attributes.map((attr) => ({
            attributeName: attr.attributeId?.name || {},
            valueName: attr.valueId?.name || {},
            hexCode: attr.valueId?.hexCode || null,
          })),
        }));
      } else {
        product.variants = [];
      }
      return product;
    })
  );

  // Convert prices to user currency with caching
  let convertedProducts = await convertProductsArrayToCurrency(
    productsWithVariants,
    userCurrency,
    lang
  );

  if (minPrice !== undefined || maxPrice !== undefined) {
    convertedProducts = convertedProducts.filter((product) => {
      const price = product.disCountPrice || product.mainPrice || 0;
      if (minPrice !== undefined && price < parseFloat(minPrice)) return false;
      if (maxPrice !== undefined && price > parseFloat(maxPrice)) return false;
      return true;
    });
  }

  const total = await ProductModellll.countDocuments(query);
  const totalPages = Math.ceil(total / limit);

  const localizedProducts = localizeProducts(convertedProducts, lang);

  return {
    data: localizedProducts,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
};


export const getProductById = async (productId, userCurrency, lang = "en") => {
  const product = await ProductModellll.findOne({
    _id: productId,
    isActive: true,
  })
    .populate("currency", "code name symbol")
    .populate("categories", "name slug description")
    .populate("brands", "name slug logo")
    .populate("createdBy", "fullName")
    .lean();

  if (!product) {
    throwError("not_found", lang, {}, 404);
  }

  if (product.hasVariants) {
    const variants = await VariantModel.find({
      productId: product._id,
      isActive: true,
    })
      .populate({
        path: "attributes.attributeId",
        select: "name",
      })
      .populate({
        path: "attributes.valueId",
        select: "name hexCode",
      })
      .lean();

    product.variants = variants.map((variant) => ({
      ...variant,
      attributes: variant.attributes.map((attr) => ({
        attributeName: attr.attributeId?.name || {},
        valueName: attr.valueId?.name || {},
        hexCode: attr.valueId?.hexCode || null,
      })),
    }));
  } else {
    product.variants = [];
  }

  // Convert prices to user currency
  const convertedProduct = await convertProductPricesToCurrency(product, userCurrency);

  // Localize product data according to user language
  const localizedProduct = localizeProduct(convertedProduct, lang);

  return localizedProduct;
};



export const validateVendorProducts = async (
  products,
  productIds, 
  userId,
  lang,
) => {

  const uniqueProductIds = [...new Set(productIds)];

  const vendorProducts = await findAll({
    model: ProductModellll,
    filter: {
      _id: { $in: uniqueProductIds },
      createdBy: userId,
    },
  });

  if (vendorProducts.length !== uniqueProductIds.length) {
    throwError("products_not_owned", lang, {}, 403);
  }


  const productsWithoutVariants = products.filter((item) => !item.variantId);

  if (productsWithoutVariants.length > 0) {
    const productIdsWithoutVariants = productsWithoutVariants.map(
      (item) => item.productId,
    );

    const uniqueProductIdsWithoutVariants = [...new Set(productIdsWithoutVariants)];

    const vendorProductsWithoutVariants = vendorProducts.filter((p) =>
      uniqueProductIdsWithoutVariants.includes(p._id.toString())
    );

    const currentDate = new Date();
    const productsInActiveOffer = vendorProductsWithoutVariants.filter(
      (product) => product.offerId && product.offerEnd > currentDate
    );

    if (productsInActiveOffer.length > 0) {
      throwError("products_in_active_offer", lang, {}, 400);
    }
  }

  return vendorProducts;
};

export const validateVendorVariants = async (products, productIds, lang) => {
  const variantIds = products
    .filter((item) => item.variantId)
    .map((item) => item.variantId);

  const uniqueVariantIds = [...new Set(variantIds)];

  if (uniqueVariantIds.length > 0) {
    const vendorVariants = await findAll({
      model: VariantModel,
      filter: {
        _id: { $in: uniqueVariantIds },
        productId: { $in: productIds },
      },
    });

    if (vendorVariants.length !== uniqueVariantIds.length) {
      throwError("variants_not_owned", lang, {}, 403);
    }

    const currentDate = new Date();
    const variantsInActiveOffer = vendorVariants.filter(
      (variant) => variant.offerId && variant.offerEnd > currentDate
    );

    if (variantsInActiveOffer.length > 0) {
      throwError("variants_in_active_offer", lang, {}, 400);
    }
  }
};

export const setOfferOnProducts = async (
  products,
  offerId,
  startDate,
  endDate,
  lang,
) => {
  await Promise.all(
    products.map(async (item) => {
      if (item.variantId) {
        await updateOne({
          model: VariantModel,
          filter: { _id: item.variantId },
          data: {
            offerId,
            offerStart: startDate,
            offerEnd: endDate,
            offerStatus:"pending"
          },
        });
      } else {
        await updateOne({
          model: ProductModellll,
          filter: { _id: item.productId },
          data: {
            offerId,
            offerStart: startDate,
            offerEnd: endDate,
            offerStatus:"pending"
          },
        });
      }
    }),
  );
};

export const clearOfferFromProducts = async (products, lang) => {
  await Promise.all(
    products.map(async (item) => {
      if (item.variantId) {
        await updateOne({
          model: VariantModel,
          filter: { _id: item.variantId },
          data: {
            offerId: null,
            offerStart: null,
            offerEnd: null,
            offerStatus:null
          },
        });
      } else {
        await updateOne({
          model: ProductModellll,
          filter: { _id: item.productId },
          data: {
            offerId: null,
            offerStart: null,
            offerEnd: null,
            offerStatus:null
          },
        });
      }
    }),
  );
};


export const approveProductsInOffer = async (products, lang) => {
  await Promise.all(
    products.map(async (item) => {
      if (item.variantId) {
        await updateOne({
          model: VariantModel,
          filter: { _id: item.variantId },
          data: {
            offerStatus: "approved",
          },
        });
      } else {
        await updateOne({
          model: ProductModellll,
          filter: { _id: item.productId },
          data: {
            offerStatus: "approved",
          },
        });
      }
    }),
  );
};
