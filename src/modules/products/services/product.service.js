import { ProductModellll } from "../../../DB/models/productSchemaaaa.js";
import { VariantModel } from "../../../DB/models/variantSchema.js";
import { findAll, updateOne } from "../../../DB/dbservice.js";
import { throwError } from "../helpers/responseMessages.js";

export const validateVendorProducts = async (
  products,
  productIds,
  userId,
  lang,
) => {
  const vendorProducts = await findAll({
    model: ProductModellll,
    filter: {
      _id: { $in: productIds },
      createdBy: userId,
    },
  });

  if (vendorProducts.length !== productIds.length) {
    throwError("products_not_owned", lang, {}, 403);
  }

  const productsWithoutVariants = products.filter((item) => !item.variantId);

  if (productsWithoutVariants.length > 0) {
    const productIdsWithoutVariants = productsWithoutVariants.map(
      (item) => item.productId,
    );

    const vendorProductsWithoutVariants = vendorProducts.filter((p) =>
      productIdsWithoutVariants.includes(p._id),
    );

    const currentDate = new Date();
    const productsInActiveOffer = vendorProductsWithoutVariants.filter(
      (product) => product.offerId && product.offerEnd > currentDate,
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

  if (variantIds.length > 0) {
    const vendorVariants = await findAll({
      model: VariantModel,
      filter: {
        _id: { $in: variantIds },
        productId: { $in: productIds },
      },
    });

    if (vendorVariants.length !== variantIds.length) {
      throwError("variants_not_owned", lang, {}, 403);
    }

    const currentDate = new Date();
    const variantsInActiveOffer = vendorVariants.filter(
      (variant) => variant.offerId && variant.offerEnd > currentDate,
    );

    if (variantsInActiveOffer.length > 0) {
      throwError("products_in_active_offer", lang, {}, 400);
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
          },
        });
      }
    }),
  );
};
