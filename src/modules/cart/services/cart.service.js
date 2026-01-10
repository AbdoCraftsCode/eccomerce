import {asyncHandelr} from "../../../utlis/response/error.response.js";
import mongoose from "mongoose";
import { CartModel } from "../../../DB/models/cart.model.js";
import { ProductModellll } from "../../../DB/models/productSchemaaaa.js";
import { VariantModel } from "../../../DB/models/variantSchema.js";

export const getCart = asyncHandelr(async (req, res, next) => {
  const userId = req.user._id;
  
  const cart = await CartModel.getOrCreateCart(userId);
  
  res.status(200).json({
    success: true,
    data: cart
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
      productId: productId
    });
    
    if (!variant) {
      return next(new Error("Variant not found for this product", { cause: 404 }));
    }
  }
  
  const cart = await CartModel.getOrCreateCart(userId);
  
  const existingItemIndex = cart.items.findIndex(item => 
    item.productId.toString() === productId && 
    (!variantId || item.variantId?.toString() === variantId)
  );
  
  if (existingItemIndex > -1) {
    return next(new Error("Item already exists in cart", { cause: 400 }));
  }
  
  if (variantId) {
    const variant = await VariantModel.findById(variantId);
    const product = await ProductModellll.findById(productId);
    
    if (!product.unlimitedStock && variant.stock < 1) {
      return next(new Error("Insufficient stock for this variant", { cause: 400 }));
    }
  } else {
    if (!product.unlimitedStock && product.stock < 1) {
      return next(new Error("Insufficient stock for this product", { cause: 400 }));
    }
  }
  
  cart.items.push({
    productId,
    variantId: variantId || undefined,
    quantity: 1
  });
  
  await cart.save();
  
  const updatedCart = await CartModel.findById(cart._id)
    .populate({
      path: 'items.productId',
      select: 'name images mainPrice disCountPrice stock'
    })
    .populate({
      path: 'items.variantId',
      select: 'price disCountPrice stock images'
    });
  
  res.status(200).json({
    success: true,
    message: "Item added to cart successfully",
    data: updatedCart
  });
});

export const updateQuantity = asyncHandelr(async (req, res, next) => {
  const userId = req.user._id;
  const { productId, variantId, action } = req.body;
  
  const cart = await CartModel.findOne({ userId });
  
  if (!cart) {
    return next(new Error("Cart not found", { cause: 404 }));
  }
  
  const itemIndex = cart.items.findIndex(item => 
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
        return next(new Error("Cannot increase quantity. Insufficient stock available.", { cause: 400 }));
      }
    } else {
      const product = await ProductModellll.findById(productId);
      
      if (!product.unlimitedStock && product.stock < newQuantity) {
        return next(new Error("Cannot increase quantity. Insufficient stock available.", { cause: 400 }));
      }
    }
  } else if (action === "decrease") {
    newQuantity = currentQuantity - 1;
    
    if (newQuantity < 1) {
      cart.items.splice(itemIndex, 1);
      await cart.save();
      
      const updatedCart = await CartModel.findById(cart._id)
        .populate({
          path: 'items.productId',
          select: 'name images mainPrice disCountPrice stock'
        })
        .populate({
          path: 'items.variantId',
          select: 'price disCountPrice stock images'
        });
      
      return res.status(200).json({
        success: true,
        message: "Item removed from cart (quantity reached 0)",
        data: updatedCart
      });
    }
  } else {
    return next(new Error("Invalid action. Must be 'increase' or 'decrease'", { cause: 400 }));
  }
  
  cart.items[itemIndex].quantity = newQuantity;
  await cart.save();
  
  const updatedCart = await CartModel.findById(cart._id)
    .populate({
      path: 'items.productId',
      select: 'name images mainPrice disCountPrice stock'
    })
    .populate({
      path: 'items.variantId',
      select: 'price disCountPrice stock images'
    });
  
  res.status(200).json({
    success: true,
    message: action === "increase" ? "Quantity increased by 1" : "Quantity decreased by 1",
    data: updatedCart
  });
});