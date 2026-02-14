import { Router } from "express";
import { authentication } from "../../middlewere/authontcation.middlewere.js";
import { authorization } from "../../middlewere/authontcation.middlewere.js";
import { validation } from "../../middlewere/validation.middlewere.js";
import { searchProductsValidation } from "./search.validation.js";
import * as searchController from "./search.controller.js";

const router = Router();

router.get(
  "/",
  authentication(),
  authorization(["Admin", "vendor"]),
  validation(searchProductsValidation, "query"),
  searchController.searchProducts
);

export default router;
