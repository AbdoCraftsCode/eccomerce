import { Router } from "express";
import { validation } from "../../middlewere/validation.middlewere.js";
import {
  authentication,
  authorization,
} from "../../middlewere/authontcation.middlewere.js";
import * as faqController from "./faq.controller.js";
import * as faqValidators from "./faq.validation.js";

const router = Router();

router.post(
  "/",
  authentication(),
  authorization(["Admin", "Owner"]),
  validation(faqValidators.createFaqValidation),
  faqController.createFaq,
);


router.delete(
  "/",
  authentication(),
  authorization(["Admin", "Owner"]),
  validation(faqValidators.deleteFaqValidation),
  faqController.deleteFaq,
);


router.get(
  "/",
  authentication(), 
  validation(faqValidators.getFaqsValidation),
  faqController.getFaqsByCategory,
);

export default router;
