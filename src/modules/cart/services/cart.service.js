import { CartModel } from "../../../DB/models/cart.model.js";
import { ProductModellll } from "../../../DB/models/productSchemaaaa.js";
import { VariantModel } from "../../../DB/models/variantSchema.js";
import { getExchangeRate } from "../../auth/service/changeCurrencyHelper.service.js";
import {
  findOne,
  findById,
  findByIdAndUpdate,
  create,
  updateOne,
} from "../../../DB/dbservice.js";
import { throwError } from "../helpers/responseMessages.js";
import { getDefaultCurrency } from "../../currency/services/currency.service.js";
import  Currency from "../../../DB/models/Currency.model.js";

export const getOrCreateCart = async (user) => {
  let cart = await findOne({
    model: CartModel,
    filter: { user },
  });

  if (!cart) {
    cart = await create({
      model: CartModel,
      data: { user, items: [] },
    });
  }

  return cart;
};

export const getDetailedCart = async (cartId) => {
  return await findById({
    model: CartModel,
    id: cartId,
    populate: [
      {
        path: "items.product",
        select:
          "name description images mainPrice disCountPrice stock currency hasVariants status isActive",
        populate: {
          path: "currency",
          select: "name.ar name.en code symbol",
        },
      },
      {
        path: "items.variant",
        select: "price disCountPrice stock images attributes productId",
        populate: [
          { path: "attributes.attributeId", select: "name type" },
          { path: "attributes.valueId", select: "value hexCode" },
        ],
      },
    ],
  });
};

export const convertCartToUserPreferences = async (
  cart,
  userCurrencyCode,
  lang,
) => {
  if (!cart || !cart.items || cart.items.length === 0) return cart;
  const defaultCurrency = await getDefaultCurrency("en");

  const targetCurrencyCode = userCurrencyCode || defaultCurrency.code;

  const rateCache = new Map();

  const getRate = async (fromCurrencyId) => {
    if (!fromCurrencyId) {
      throwError("product_without_currency", lang, {}, 400);
    }; 

    const fromCurrencyDoc = await findById({
      model: Currency,
      id: fromCurrencyId,
      select: "code",
    });

    const fromCode = fromCurrencyDoc?.code;
    const cacheKey = `${fromCode}_${targetCurrencyCode}`;

    if (rateCache.has(cacheKey)) {
      return rateCache.get(cacheKey);
    }

    if (fromCode === targetCurrencyCode) {
      rateCache.set(cacheKey, 1);
      return 1;
    }

    const rate = await getExchangeRate(fromCode, targetCurrencyCode);
    const finalRate = rate !== null && rate > 0 ? rate : 1;
    rateCache.set(cacheKey, finalRate);
    return finalRate;
  };

  const cartObj = cart.toObject();
  let newSubTotal = 0;

  for (const item of cartObj.items) {
    //if (!item.product) continue;

    const product = item.product;
    const exchangeRate = await getRate(product.currency);

    if (exchangeRate !== 1) {
      if (product.mainPrice) {
        const val = parseFloat(product.mainPrice);
        if (!isNaN(val)) {
          product.mainPrice = (val * exchangeRate).toFixed(2).toString();
        }
      }

      if (product.disCountPrice) {
        const val = parseFloat(product.disCountPrice);
        if (!isNaN(val)) {
          product.disCountPrice = (val * exchangeRate).toFixed(2).toString();
        }
      }
    }

    product.currency = targetCurrencyCode;

    if (item.variant && exchangeRate !== 1) {
      const variant = item.variant;

      if (variant.price) {
        const val = parseFloat(variant.price);
        if (!isNaN(val)) {
          variant.price = (val * exchangeRate).toFixed(2).toString();
        }
      }

      if (variant.disCountPrice) {
        const val = parseFloat(variant.disCountPrice);
        if (!isNaN(val)) {
          variant.disCountPrice = (val * exchangeRate).toFixed(2).toString();
        }
      }
    }

    if (product.name) {
      product.name =
        product.name?.[lang] || product.name?.en || "Unnamed Product";
    }

    if (product.description) {
      product.description =
        product.description?.[lang] || product.description?.en || "Unnamed Product";
    }

    let itemPrice = 0;
    if (item.variant) {
      itemPrice = parseFloat(
        item.variant.disCountPrice || item.variant.price || 0,
      );
    } else {
      itemPrice = parseFloat(product.disCountPrice || product.mainPrice || 0);
    }

    newSubTotal += itemPrice * item.quantity;
  }

  cartObj.subTotal = parseFloat(newSubTotal.toFixed(2));
  cartObj.currency = targetCurrencyCode;

  return cartObj;
};

export const getCart = async (req, lang) => {
  const user = req.user._id;
  let cart = await getOrCreateCart(user);
  cart = await getDetailedCart(cart._id);
  cart = await convertCartToUserPreferences(cart, req.user.currency?.code , lang);
  return cart;
};

export const addToCart = async (req, lang) => {
  const userId = req.user._id;
  const { productId, variantId, quantity = 1 } = req.body;

  if (quantity < 1) {
    throwError("invalid_quantity", lang, {}, 400);
  }

  const product = await findById({
    model: ProductModellll,
    id: productId,
  });

  if (!product) {
    throwError("product_not_found", lang, {}, 404);
  }

  if (variantId) {
    const variant = await findOne({
      model: VariantModel,
      filter: {
        _id: variantId,
        productId: productId,
      },
    });

    if (!variant) {
      throwError("variant_not_found", lang, {}, 404);
    }
  }

  let cart = await getOrCreateCart(userId);

  const existingItem = cart.items.find((item) => {
    const isSameProduct = item.product.toString() === productId;

    if (variantId) {
      const isSameVariant = item.variant?.toString() === variantId;
      return isSameProduct && isSameVariant;
    } else {
      return isSameProduct && !item.variantId;
    }
  });

  if (existingItem) {
    throwError("item_exists", lang, {}, 400);
  }

  if (variantId) {
    const variant = await findById({
      model: VariantModel,
      id: variantId,
    });

    if (!product.unlimitedStock && variant.stock < quantity) {
      throwError("insufficient_stock", lang, { stock: variant.stock }, 400);
    }
  } else {
    if (!product.unlimitedStock && product.stock < quantity) {
      throwError("insufficient_stock", lang, { stock: product.stock }, 400);
    }
  }

  await updateOne({
    model: CartModel,
    filter: { _id: cart._id },
    data: {
      $push: {
        items: {
          product: productId,
          variant: variantId || null,
          quantity,
        },
      },
    },
  });

  let updatedCart = await getDetailedCart(cart._id);
  updatedCart = await convertCartToUserPreferences(
    updatedCart,
    req.user.currency?.code,
    lang,
  );

  return updatedCart;
};

export const deleteItemFromCart = async (req, lang) => {
  const userId = req.user._id;
  const { productId, variantId } = req.body;

  const cart = await findOne({
    model: CartModel,
    filter: { user:userId },
  });

  if (!cart) {
    throwError("cart_not_found", lang, {}, 404);
  }

  const itemIndex = cart.items.findIndex((item) => {
    const sameProduct = item.product.toString() === productId;

    if (variantId) {
      return sameProduct && item.variant?.toString() === variantId;
    }
    return sameProduct && !item.variantId;
  });

  if (itemIndex === -1) {
    throwError("item_not_found", lang, {}, 404);
  }

  cart.items.splice(itemIndex, 1);
  await cart.save();

  if (cart.items.length === 0) {
    let emptyCart = await getDetailedCart(cart._id);
    emptyCart = await convertCartToUserPreferences(
      emptyCart,
      req.user.currency,
      lang,
    );
    return { cart: emptyCart, messageKey: "cart_emptied" };
  }

  let updatedCart = await getDetailedCart(cart._id);
  updatedCart = await convertCartToUserPreferences(
    updatedCart,
    req.user.currency?.code,
    lang,
  );
  return { cart: updatedCart, messageKey: "removed" };
};

export const updateQuantity = async (req, lang) => {
  const userId = req.user._id;
  const { productId, variantId, action } = req.body;

  const cart = await findOne({
    model: CartModel,
    filter: { user:userId },
  });

  if (!cart) {
    throwError("cart_not_found", lang, {}, 404);
  }

  const itemIndex = cart.items.findIndex((item) => {
    const sameProduct = item.product.toString() === productId;

    if (variantId) {
      return sameProduct && item.variant?.toString() === variantId;
    }
    return sameProduct && !item.variantId;
  });

  if (itemIndex === -1) {
    throwError("item_not_found", lang, {}, 404);
  }

  const currentQuantity = cart.items[itemIndex].quantity;
  let newQuantity;

  if (action === "increase") {
    newQuantity = currentQuantity + 1;

    if (variantId) {
      const variant = await findById({
        model: VariantModel,
        id: variantId,
      });
      const product = await findById({
        model: ProductModellll,
        id: productId,
      });

      if (!product.unlimitedStock && variant.stock < newQuantity) {
        throwError("insufficient_stock", lang, {}, 400);
      }
    } else {
      const product = await findById({
        model: ProductModellll,
        id: productId,
      });

      if (!product.unlimitedStock && product.stock < newQuantity) {
        throwError("insufficient_stock", lang, {}, 400);
      }
    }
  } else if (action === "decrease") {
    newQuantity = currentQuantity - 1;

    if (newQuantity < 1) {
      cart.items.splice(itemIndex, 1);
      await cart.save();

      let updatedCart = await getDetailedCart(cart._id);
      updatedCart = await convertCartToUserPreferences(
        updatedCart,
        req.user.currency,
        lang,
      );
      return { cart: updatedCart, messageKey: "removed" };
    }
  } else {
    throwError("invalid_action", lang, {}, 400);
  }

  cart.items[itemIndex].quantity = newQuantity;
  await cart.save();

  let updatedCart = await getDetailedCart(cart._id);
  updatedCart = await convertCartToUserPreferences(
    updatedCart,
    req.user.currency?.code,
    lang,
  );
  return { cart: updatedCart, messageKey: "quantity_updated" };
};

export const getCartWithDetails = async (customerId) => {
  return await CartModel.findOne({ user: customerId })
    .populate({
      path: "items.product",
      select:
        "name images mainPrice disCountPrice stock createdBy hasVariants status isActive",
    })
    .populate({
      path: "items.variant",
      select: "price disCountPrice stock images attributes productId",
    });
};

export const validateCart = (cart) => {
  if (!cart || cart.items.length === 0) {
    throw new Error("Cart is empty", { cause: 400 });
  }
};
