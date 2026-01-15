import { asyncHandelr } from "../../../utlis/response/error.response.js";
import mongoose from "mongoose";
import { CartModel } from "../../../DB/models/cart.model.js";
import { ProductModellll } from "../../../DB/models/productSchemaaaa.js";
import { VariantModel } from "../../../DB/models/variantSchema.js";
import { getExchangeRate } from "../../auth/service/changeCurrencyHelper.service.js";

const getDetailedCart = async (cartId) => {
  const cart = await CartModel.findById(cartId)
    .populate({
      path: "items.productId",
      select: "name images mainPrice disCountPrice stock",
    })
    .populate({
      path: "items.variantId",
      select: "price disCountPrice stock images attributes",
      populate: {
        path: "attributes.attributeId attributes.valueId",
        select: "name value type",
      },
    });
  return cart;
};

export const getCart = asyncHandelr(async (req, res, next) => {
  const userId = req.user._id;
  let cart = await CartModel.getOrCreateCart(userId);
  console.log("1");
  cart = await getDetailedCart(cart._id);
  console.log("2");
  cart = await convertCartToUserPreferences(
    cart,
    req.user.currency,
    req.user.lang
  );
  res.status(200).json({
    success: true,
    data: cart,
  });
});

export const addToCart = asyncHandelr(async (req, res, next) => {
  const userId = req.user._id;
  const { productId, variantId, quantity = 1 } = req.body; // Add quantity with default 1

  // Validate quantity
  if (quantity < 1) {
    return next(new Error("Quantity must be at least 1", { cause: 400 }));
  }

  const product = await ProductModellll.findById(productId);
  if (!product) {
    return next(new Error("Product not found", { cause: 404 }));
  }

  if (variantId) {
    const variant = await VariantModel.findOne({
      _id: variantId,
      productId: productId,
    });

    if (!variant) {
      return next(
        new Error("Variant not found for this product", { cause: 404 })
      );
    }
  }

  let cart = await CartModel.findOne({ userId });

  if (!cart) {
    cart = await CartModel.create({ userId, items: [] });
  }

  const existingItem = cart.items.find((item) => {
    const isSameProduct = item.productId.toString() === productId;

    if (variantId) {
      const isSameVariant = item.variantId?.toString() === variantId;
      return isSameProduct && isSameVariant;
    } else {
      return isSameProduct && !item.variantId;
    }
  });

  if (existingItem) {
    return next(new Error("Item already exists in cart", { cause: 400 }));
  }

  // Check stock with the requested initial quantity
  if (variantId) {
    const variant = await VariantModel.findById(variantId);
    const product = await ProductModellll.findById(productId);

    if (!product.unlimitedStock && variant.stock < quantity) {
      return next(
        new Error(`Insufficient stock. Only ${variant.stock} available`, {
          cause: 400,
        })
      );
    }
  } else {
    if (!product.unlimitedStock && product.stock < quantity) {
      return next(
        new Error(`Insufficient stock. Only ${product.stock} available`, {
          cause: 400,
        })
      );
    }
  }

  // Add new item with the requested initial quantity
  cart.items.push({
    productId,
    variantId: variantId || null,
    quantity, // Use the requested quantity instead of always 1
  });

  await cart.save();

  let updatedCart = await getDetailedCart(cart.id);
  updatedCart = await convertCartToUserPreferences(
    updatedCart,
    req.user.currency,
    req.user.lang
  );
  
  res.status(200).json({
    success: true,
    message: `Item added to cart with quantity ${quantity}`,
    data: updatedCart,
  });
});

export const deleteItemFromCart = asyncHandelr(async (req, res, next) => {
  const userId = req.user._id;
  const { productId, variantId } = req.body;

  const cart = await CartModel.findOne({ userId });

  if (!cart) {
    return next(new Error("Cart not found", { cause: 404 }));
  }

  const itemIndex = cart.items.findIndex((item) => {
    const sameProduct = item.productId.toString() === productId;

    if (variantId) {
      return sameProduct && item.variantId?.toString() === variantId;
    }
    return sameProduct && !item.variantId;
  });

  if (itemIndex === -1) {
    return next(new Error("Item not found in cart", { cause: 404 }));
  }

  cart.items.splice(itemIndex, 1);

  if (cart.items.length === 0) {
    await cart.save();

    let emptyCart = await getDetailedCart(cart.id);
    emptyCart = await convertCartToUserPreferences(
      emptyCart,
      req.user.currency,
      req.user.lang
    );
    return res.status(200).json({
      success: true,
      message: "Item removed from cart successfully. Cart is now empty.",
      data: emptyCart,
    });
  }

  await cart.save();

  let updatedCart = await getDetailedCart(cart.id);
  updatedCart = await convertCartToUserPreferences(
    updatedCart,
    req.user.currency,
    req.user.lang
  );
  res.status(200).json({
    success: true,
    message: "Item removed from cart successfully",
    data: updatedCart,
  });
});

export const updateQuantity = asyncHandelr(async (req, res, next) => {
  const userId = req.user._id;
  const { productId, variantId, action } = req.body;

  const cart = await CartModel.findOne({ userId });

  if (!cart) {
    return next(new Error("Cart not found", { cause: 404 }));
  }

  const itemIndex = cart.items.findIndex(
    (item) =>
      item.productId.toString() === productId &&
      (!variantId || item.variantId?.toString() === variantId)
  );

  if (itemIndex === -1) {
    return next(new Error("Item not found in cart", { cause: 404 }));
  }

  const currentQuantity = cart.items[itemIndex].quantity;
  let newQuantity;

  if (action === "increase") {
    newQuantity = currentQuantity + 1;

    if (variantId) {
      const variant = await VariantModel.findById(variantId);
      const product = await ProductModellll.findById(productId);

      if (!product.unlimitedStock && variant.stock < newQuantity) {
        return next(
          new Error("Cannot increase quantity. Insufficient stock available.", {
            cause: 400,
          })
        );
      }
    } else {
      const product = await ProductModellll.findById(productId);

      if (!product.unlimitedStock && product.stock < newQuantity) {
        return next(
          new Error("Cannot increase quantity. Insufficient stock available.", {
            cause: 400,
          })
        );
      }
    }
  } else if (action === "decrease") {
    newQuantity = currentQuantity - 1;

    if (newQuantity < 1) {
      cart.items.splice(itemIndex, 1);
      await cart.save();

      let updatedCart = await getDetailedCart(cart.id);
      updatedCart = await convertCartToUserPreferences(
        updatedCart,
        req.user.currency,
        req.user.lang
      );
      return res.status(200).json({
        success: true,
        message: "Item removed from cart (quantity reached 0)",
        data: updatedCart,
      });
    }
  } else {
    return next(
      new Error("Invalid action. Must be 'increase' or 'decrease'", {
        cause: 400,
      })
    );
  }

  cart.items[itemIndex].quantity = newQuantity;
  await cart.save();

  let updatedCart = await getDetailedCart(cart.id);
  updatedCart = await convertCartToUserPreferences(
    updatedCart,
    req.user.currency,
    req.user.lang
  );
  res.status(200).json({
    success: true,
    message:
      action === "increase"
        ? "Quantity increased by 1"
        : "Quantity decreased by 1",
    data: updatedCart,
  });
});

const convertCartToUserPreferences = async (cart, currency, lang) => {
  if (!cart || !cart.items || cart.items.length === 0) return cart;

  const fromCurrency = "USD";
  const targetCurrency = currency.toUpperCase();
  const exchangeRate = await getExchangeRate(fromCurrency, targetCurrency);

  const cartObj = cart.toObject();

  let newSubTotal = 0;

  cartObj.items.forEach((item) => {
    if (
      exchangeRate &&
      item.productId &&
      (!item.productId.currency || item.productId.currency !== targetCurrency)
    ) {
      if (item.productId.mainPrice) {
        item.productId.mainPrice = (
          parseFloat(item.productId.mainPrice) * exchangeRate
        )
          .toFixed(2)
          .toString();
      }
      if (item.productId.disCountPrice) {
        item.productId.disCountPrice = (
          parseFloat(item.productId.disCountPrice) * exchangeRate
        )
          .toFixed(2)
          .toString();
      }
      item.productId.currency = targetCurrency;
    } else if (!exchangeRate && item.productId) {
      item.productId.currency = "USD";
    }

    if (
      exchangeRate &&
      item.variantId &&
      (!item.variantId.currency || item.variantId.currency !== targetCurrency)
    ) {
      if (item.variantId.price) {
        item.variantId.price = (parseFloat(item.variantId.price) * exchangeRate)
          .toFixed(2)
          .toString();
      }
      if (item.variantId.disCountPrice) {
        item.variantId.disCountPrice = (
          parseFloat(item.variantId.disCountPrice) * exchangeRate
        )
          .toFixed(2)
          .toString();
      }
      item.variantId.currency = targetCurrency;
    } else if (!exchangeRate && item.variantId) {
      item.variantId.currency = "USD";
    }

    if (item.productId && item.productId.name) {
      if (
        typeof item.productId.name === "object" &&
        item.productId.name !== null
      ) {
        if (lang && item.productId.name[lang]) {
          item.productId.name = item.productId.name[lang];
        } else {
          item.productId.name = "Unnamed Product";
        }
      }
    } else {
      item.productId.name = "Unnamed Product";
    }

    // Calculate item price for subTotal
    let itemPrice = 0;
    if (item.variantId) {
      itemPrice = parseFloat(
        item.variantId.disCountPrice || item.variantId.price || 0
      );
    } else {
      itemPrice = parseFloat(
        item.productId.disCountPrice || item.productId.mainPrice || 0
      );
    }
    newSubTotal += itemPrice * item.quantity;
  });

  cartObj.subTotal = parseFloat(newSubTotal.toFixed(2));

  return cartObj;
};

export const getCartWithDetails = async (customerId) => {
  return await CartModel.findOne({ userId: customerId })
    .populate({
      path: "items.productId",
      select:
        "name images mainPrice disCountPrice stock createdBy hasVariants status isActive",
    })
    .populate({
      path: "items.variantId",
      select: "price disCountPrice stock images attributes productId",
    });
};

export const validateCart = (cart) => {
  if (!cart || cart.items.length === 0) {
    throw new Error("Cart is empty", { cause: 400 });
  }
};
