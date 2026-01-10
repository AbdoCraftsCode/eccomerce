import { Router } from "express";
import { authentication, authorization } from "../../middlewere/authontcation.middlewere.js";
import { validation } from "../../middlewere/validation.middlewere.js";
import * as cartValidators from "./cart.validatoin.js";
import * as cartServices from "./services/cart.service.js";

const router = Router();

router.get(
  "/",
  authentication(),
//   authorization(endpoint.get),
  cartServices.getCart
);

router.post(
  "/add",
  authentication(),
//   authorization(endpoint.add),
  validation(cartValidators.addToCartValidation),
  cartServices.addToCart
);

router.patch(
  "/quantity",
  authentication(),
//   authorization(endpoint.updateQuantity),
  validation(cartValidators.updateQuantityValidation),
  cartServices.updateQuantity
);

export default router;