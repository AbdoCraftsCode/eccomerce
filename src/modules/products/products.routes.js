import { Router } from "express";
import * as productsController from "./products.controller.js";
import { validation } from "../../middlewere/validation.middlewere.js";
import { authentication } from "../../middlewere/authontcation.middlewere.js";
import {
  getProductsSchema,
  getProductByIdSchema,
} from "./products.validation.js";

const router = Router();

router.get(
  "/",
  authentication(),
  validation(getProductsSchema),
  productsController.getProducts
);

router.get(
  "/:productId",
  authentication(),
  validation(getProductByIdSchema),
  productsController.getProductById
);

export default router;
