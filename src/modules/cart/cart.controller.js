import { asyncHandelr } from "../../utlis/response/error.response.js";
import * as cartService from "./services/cart.service.js";
import { getResponseMessage } from "./helpers/responseMessages.js";
import { getUserLanguage } from "../../utlis/localization/langUserHelper.js";

export const getCart = asyncHandelr(async (req, res) => {
  const lang = getUserLanguage(req);
  const cart = await cartService.getCart(req, lang);

  res.status(200).json({
    success: true,
    message: getResponseMessage("fetched", lang),
    data: cart,
  });
});

export const addToCart = asyncHandelr(async (req, res) => {
  const lang = getUserLanguage(req);
  const cart = await cartService.addToCart(req, lang);

  res.status(200).json({
    success: true,
    message: getResponseMessage("added", lang),
    data: cart,
  });
});

export const deleteItemFromCart = asyncHandelr(async (req, res) => {
  const lang = getUserLanguage(req);
  const { cart, messageKey } = await cartService.deleteItemFromCart(req, lang);

  res.status(200).json({
    success: true,
    message: getResponseMessage(messageKey, lang),
    data: cart,
  });
});

export const updateQuantity = asyncHandelr(async (req, res) => {
  const lang = getUserLanguage(req);
  const { cart, messageKey } = await cartService.updateQuantity(req, lang);

  res.status(200).json({
    success: true,
    message: getResponseMessage(messageKey, lang),
    data: cart,
  });
});

export const applyCoupon = asyncHandelr(async (req, res) => {
  const lang = getUserLanguage(req);
  const userId = req.user._id;
  const { couponCode } = req.body;
  const userCurrencyCode = req.user.currency?.code;
  const cart = await cartService.applyCouponToCart(
    userId,
    couponCode,
    userCurrencyCode,
    lang,
  );

  res.status(200).json({
    success: true,
    message: getResponseMessage("coupon_applied", lang),
    data: cart,
  });
});
