import { Router } from "express";
//import { authentication } from "../../middlewere/authontcation.middlewere.js"; 
import { validation } from "../../middlewere/validation.middlewere.js";
import { searchProductsValidation } from "./search.validation.js"; 
import { searchProducts } from "./services/search.service.js"; 

const router = Router();

router.get(
  "/",
//   authentication(),
  validation(searchProductsValidation, "query"),
  searchProducts
);

export default router;