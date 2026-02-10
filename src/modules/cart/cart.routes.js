import { Router } from "express";
import { authentication, authorization } from "../../middlewere/authontcation.middlewere.js";
import { validation } from "../../middlewere/validation.middlewere.js";
import * as cartController from "./cart.controller.js";
import * as cartValidators from "./cart.validation.js";

const router = Router();

router.get(
  "/",
  authentication(),
  cartController.getCart
);

router.post(
  "/add",
  authentication(),
  validation(cartValidators.addToCartValidation),
  cartController.addToCart
);

router.delete(
  "/remove",
  authentication(),
  validation(cartValidators.deleteItemFromCartValidation),
  cartController.deleteItemFromCart
);

router.patch(
  "/quantity",
  authentication(),
  validation(cartValidators.updateQuantityValidation),
  cartController.updateQuantity
);

router.post(
  "/applyCoupon",
  authentication(),
  validation(cartValidators.applyCouponValidation),
  cartController.applyCoupon
);

export default router;