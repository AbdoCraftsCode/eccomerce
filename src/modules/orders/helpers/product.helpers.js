import { ProductModellll } from "../../../DB/models/productSchemaaaa.js";
import { VariantModel } from "../../../DB/models/variantSchema.js";

export const validateProductsAvailability = async (cartItems, session = null) => {
  const productIds = [...new Set(cartItems.map((item) => item.productId._id.toString()))];
  const products = await ProductModellll.find({
    _id: { $in: productIds },
    isActive: true,
    status: "published",
  }).session(session).lean();
  if (products.length !== productIds.length) {
    throw new Error("One or more products are no longer available", { cause: 400 });
  }
  return { products, productIds };
};

export const createProductsMap = (products) => {
  const productsMap = {};
  products.forEach((p) => (productsMap[p._id.toString()] = p));
  return productsMap;
};

export const fetchVariantsForCart = async (cartItems, session = null) => {
  const variantIds = cartItems
    .map(item => item.variantId?._id || item.variantId)
    .filter(id => id);
  if (variantIds.length === 0) return {};
  const variants = await VariantModel.find({
    _id: { $in: variantIds }
  }).session(session).lean();
  const variantsMap = {};
  variants.forEach(v => (variantsMap[v._id.toString()] = v));
  return variantsMap;
};