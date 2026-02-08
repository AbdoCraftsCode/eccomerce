import { Router } from "express";
import * as currencyController from "./currency.controller.js";
import { validation } from "../../middlewere/validation.middlewere.js";
import {
  authentication,
  authorization,
} from "../../middlewere/authontcation.middlewere.js";
import {
  createCurrencySchema,
  updateCurrencySchema,
  currencyIdSchema,
  toggleStatusSchema,
} from "./currency.validation.js";

const router = Router();

router.post(
  "/",
  authentication(),
  authorization(["Admin", "Owner"]),
  validation(createCurrencySchema),
  currencyController.createCurrency,
);

router.put(
  "/:id",
  authentication(),
  authorization(["Admin", "Owner"]),
  validation(updateCurrencySchema),
  currencyController.updateCurrency,
);

router.delete(
  "/:id",
  authentication(),
  authorization(["Admin", "Owner"]),
  validation(currencyIdSchema),
  currencyController.deleteCurrency,
);

router.patch(
  "/:id/toggle-status",
  authentication(),
  authorization(["Admin", "Owner"]),
  validation(toggleStatusSchema),
  currencyController.toggleCurrencyStatus,
);

router.patch(
  "/:id/set-default",
  authentication(),
  authorization(["Admin", "Owner"]),
  validation(currencyIdSchema),
  currencyController.setDefaultCurrency,
);

router.get("/", currencyController.getAllCurrencies);
router.get("/default", currencyController.getDefaultCurrency);
router.get("/active", currencyController.getActiveCurrencies);
router.get("/validate", currencyController.validateCurrency);
router.get(
  "/:id",
  validation(currencyIdSchema),
  currencyController.getCurrencyById,
);

export default router;
