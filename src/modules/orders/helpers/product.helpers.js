import { ProductModellll } from "../../../DB/models/productSchemaaaa.js";
import { VariantModel } from "../../../DB/models/variantSchema.js";


export const validateAndFetchProducts = async (cartItems, session = null) => {
  const productIds = [
    ...new Set(cartItems.map((item) => item.product._id.toString())),
  ];

  // Fetch with session for transactional consistency
  const products = await ProductModellll.find({
    _id: { $in: productIds },
    isActive: true,
    status: "published",
  })
    .populate("currency", "code")
    .session(session)
    .lean();

  if (products.length !== productIds.length) {
    throw new Error("One or more products are no longer available", {
      cause: 400,
    });
  }

  return products;
};

export const createProductsMap = (products) => {
  const productsMap = {};
  products.forEach((p) => {
    productsMap[p._id.toString()] = p;
  });
  return productsMap;
};

/**
 * Fetch and validate variants with session
 */
export const fetchAndValidateVariants = async (cartItems, session = null) => {
  const variantIds = cartItems
    .map((item) => item.variant?._id || item.variant)
    .filter((id) => id);

  if (variantIds.length === 0) return {};

  const variants = await VariantModel.find({
    _id: { $in: variantIds },
    isActive: true,
  })
    .session(session)
    .lean();

  const variantsMap = {};
  variants.forEach((v) => {
    variantsMap[v._id.toString()] = v;
  });

  // Validate all requested variants were found
  const foundIds = new Set(Object.keys(variantsMap));
  const missingVariants = variantIds.filter(
    (id) => !foundIds.has(id.toString())
  );

  if (missingVariants.length > 0) {
    throw new Error(
      `Some variants are no longer available: ${missingVariants.join(", ")}`,
      { cause: 400 }
    );
  }

  return variantsMap;
};