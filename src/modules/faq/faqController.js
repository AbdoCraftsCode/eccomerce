import { Router } from "express";
import { validation } from "../../middlewere/validation.middlewere.js";
import * as faqValidators from "./faqValidation.js";
import { authentication } from "../../middlewere/authontcation.middlewere.js";
import * as faqServices from "./services/faqService.js";

const router = Router();

router.post(
  "/",
  authentication(),
  validation(faqValidators.createFaqValidation),
  faqServices.createFaq,
);

router.delete(
  "/",
  authentication(),
  validation(faqValidators.deleteFaqValidation),
  faqServices.deleteFaq
);

router.get(
  "/",
  authentication(),
  validation(faqValidators.getFaqsValidation),
  faqServices.getFaqsByCategory,
);

export default router;
