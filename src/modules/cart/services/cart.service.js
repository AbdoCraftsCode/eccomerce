import { asyncHandelr } from "../../../utlis/response/error.response.js";
import mongoose from "mongoose";
import { CartModel } from "../../../DB/models/cart.model.js";
import { ProductModellll } from "../../../DB/models/productSchemaaaa.js";
import { VariantModel } from "../../../DB/models/variantSchema.js";
import { getExchangeRate } from "../../auth/service/changeCurrencyHelper.service.js";

export const getCart = asyncHandelr(async (req, res, next) => {
  const userId = req.user._id;
  let cart = await CartModel.getOrCreateCart(userId);
  cart = await CartModel.findById(cart._id)
    .populate({
      path: "items.productId",
      select: "name images mainPrice disCountPrice stock",
    })
    .populate({
      path: "items.variantId",
      select: "price disCountPrice stock images",
    });
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
  const { productId, variantId } = req.body;

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

  if (variantId) {
    const variant = await VariantModel.findById(variantId);
    const product = await ProductModellll.findById(productId);

    if (!product.unlimitedStock && variant.stock < 1) {
      return next(
        new Error("Insufficient stock for this variant", { cause: 400 })
      );
    }
  } else {
    if (!product.unlimitedStock && product.stock < 1) {
      return next(
        new Error("Insufficient stock for this product", { cause: 400 })
      );
    }
  }

  cart.items.push({
    productId,
    variantId: variantId || null,
    quantity: 1,
  });

  await cart.save();

  let updatedCart = await CartModel.findById(cart._id)
    .populate({
      path: "items.productId",
      select: "name images mainPrice disCountPrice stock",
    })
    .populate({
      path: "items.variantId",
      select: "price disCountPrice stock images",
    });
  updatedCart = await convertCartToUserPreferences(
    updatedCart,
    req.user.currency,
    req.user.lang
  );
  res.status(200).json({
    success: true,
    message: "Item added to cart successfully",
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

    let emptyCart = await CartModel.findById(cart._id)
      .populate({
        path: "items.productId",
        select: "name images mainPrice disCountPrice stock",
      })
      .populate({
        path: "items.variantId",
        select: "price disCountPrice stock images",
      });
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

  let updatedCart = await CartModel.findById(cart._id)
    .populate({
      path: "items.productId",
      select: "name images mainPrice disCountPrice stock",
    })
    .populate({
      path: "items.variantId",
      select: "price disCountPrice stock images",
    });
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

      let updatedCart = await CartModel.findById(cart._id)
        .populate({
          path: "items.productId",
          select: "name images mainPrice disCountPrice stock",
        })
        .populate({
          path: "items.variantId",
          select: "price disCountPrice stock images",
        });
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

  let updatedCart = await CartModel.findById(cart._id)
    .populate({
      path: "items.productId",
      select: "name images mainPrice disCountPrice stock",
    })
    .populate({
      path: "items.variantId",
      select: "price disCountPrice stock images",
    });
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

  const fromCurrency = "USD"; // Assuming base is USD
  const exchangeRate = await getExchangeRate(fromCurrency, currency.toUpperCase());

  let newSubTotal = 0;

  // Convert to plain object to make modifications easier
  const cartObj = cart.toObject();

  cartObj.items.forEach(item => {
    // Convert prices if exchangeRate available
    if (exchangeRate) {
      if (item.productId) {
        if (item.productId.mainPrice) {
          item.productId.mainPrice = (parseFloat(item.productId.mainPrice) * exchangeRate).toFixed(2).toString();
        }
        if (item.productId.disCountPrice) {
          item.productId.disCountPrice = (parseFloat(item.productId.disCountPrice) * exchangeRate).toFixed(2).toString();
        }
        item.productId.currency = currency.toUpperCase(); // Set transformed currency
      }

      if (item.variantId) {
        if (item.variantId.price) {
          item.variantId.price = (parseFloat(item.variantId.price) * exchangeRate).toFixed(2).toString();
        }
        if (item.variantId.disCountPrice) {
          item.variantId.disCountPrice = (parseFloat(item.variantId.disCountPrice) * exchangeRate).toFixed(2).toString();
        }
        item.variantId.currency = currency.toUpperCase(); // Set transformed currency
      }
    } else {
      // If no conversion, default to USD
      if (item.productId) {
        item.productId.currency = 'USD';
      }
      if (item.variantId) {
        item.variantId.currency = 'USD';
      }
    }

    // Select name based on lang and replace the object with string
    if (item.productId.name) {
      if (item.productId.name[lang]) {
        item.productId.name = item.productId.name[lang];
      } else {
        item.productId.name = item.productId.name.en || item.productId.name.ar ;
      }
    }

    // Calculate item price for subTotal (use disCountPrice if exists, else mainPrice/price)
    let itemPrice = 0;
    if (item.variantId) {
      itemPrice = parseFloat(item.variantId.disCountPrice || item.variantId.price );
    } else {
      itemPrice = parseFloat(item.productId.disCountPrice || item.productId.mainPrice );
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
