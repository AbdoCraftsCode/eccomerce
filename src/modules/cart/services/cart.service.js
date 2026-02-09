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

  // Track processed products to handle same product appearing multiple times
  // (e.g., product-only and product+variant from same product)
  const processedProducts = new Map(); // productId -> exchangeRate

  for (const item of cartObj.items) {
    // Skip items without product (product may have been deleted)
    if (!item.product) continue;

    const product = item.product;
    const productId = product._id.toString();

    let exchangeRate;
    let productAlreadyProcessed = processedProducts.has(productId);

    if (productAlreadyProcessed) {
      // Product was already processed in a previous item - product.currency is already a string
      // Use the cached exchange rate
      exchangeRate = processedProducts.get(productId);
    } else {
      // First time processing this product - product.currency is still an object
      // Handle case where product has no currency set
      if (!product.currency || (typeof product.currency === 'object' && !product.currency._id)) {
        throwError("product_without_currency", lang, {}, 400);
      }

      exchangeRate = await getRate(product.currency._id.toString());
      processedProducts.set(productId, exchangeRate);
    }

    // Calculate item price for subtotal
    // If variant exists, use variant price; otherwise use product price
    let itemPrice = 0;
    if (item.variant) {
      // User pays variant price when variant is specified
      // Check if variant prices are already converted (string with decimals) or original
      const variantPrice = parseFloat(item.variant.disCountPrice || item.variant.price || 0);
      itemPrice = variantPrice;
    } else {
      // User pays product price when only product is specified (no variant)
      const productPrice = parseFloat(product.disCountPrice || product.mainPrice || 0);
      itemPrice = productPrice;
    }

    // Add to subtotal
    // If product was already processed, prices are already converted
    // Otherwise, we need to apply exchange rate
    if (productAlreadyProcessed) {
      // Prices already converted - for variant items after product was processed
      // Variant prices still need conversion if this is the first time seeing this variant
      if (item.variant && !item.variant._processed) {
        newSubTotal += (itemPrice * exchangeRate) * item.quantity;
      } else {
        newSubTotal += itemPrice * item.quantity;
      }
    } else {
      // First time - apply exchange rate
      newSubTotal += (itemPrice * exchangeRate) * item.quantity;
    }

    // Convert product prices for display (only if not already processed)
    if (!productAlreadyProcessed && exchangeRate !== 1) {
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

      product.currency = targetCurrencyCode;
    }

    // Convert variant prices for display (each variant is unique, always convert)
    if (item.variant && exchangeRate !== 1 && !item.variant._processed) {
      const variant = item.variant;
      item.variant._processed = true; // Mark as processed

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

    // Localize product name
    if (product.name) {
      product.name =
        product.name?.[lang] || product.name?.en || "Unnamed Product";
    }

    // Localize product description
    if (product.description) {
      product.description =
        product.description?.[lang] || product.description?.en || "Unnamed Product";
    }
  }

  // Round subtotal to 2 decimal places for consistency
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

  // Check if exact same item already exists in cart
  // User CAN have both product-only AND product+variant from same product
  // Only throw error if trying to add the EXACT same combination
  const existingItem = cart.items.find((item) => {
    const isSameProduct = item.product.toString() === productId;
    if (!isSameProduct) return false;

    // Check if variant status matches
    const itemHasVariant = item.variant !== null && item.variant !== undefined;
    const requestHasVariant = variantId !== null && variantId !== undefined;

    if (requestHasVariant && itemHasVariant) {
      // Both have variants - check if it's the SAME variant
      return item.variant.toString() === variantId;
    } else if (!requestHasVariant && !itemHasVariant) {
      // Both are product-only (no variant) - this is a duplicate
      return true;
    }

    // One has variant, one doesn't - these are different items, allow both
    return false;
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
    return sameProduct && !item.variant;
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
      req.user.currency?.code,
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
    // Product only (no variant) - check that item also has no variant
    return sameProduct && !item.variant;
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
        req.user.currency?.code,
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
