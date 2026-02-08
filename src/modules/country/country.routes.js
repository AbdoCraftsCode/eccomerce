import { Router } from "express";
import * as countryController from "./country.controller.js";
import { validation } from "../../middlewere/validation.middlewere.js";
import {
  authentication,
  authorization,
} from "../../middlewere/authontcation.middlewere.js";
import {
  createCountrySchema,
  countryIdSchema,
  toggleStatusSchema,
} from "./country.validation.js";

const router = Router();

router.post(
  "/",
  authentication(),
  authorization(["Admin", "Owner"]),
  validation(createCountrySchema),
  countryController.createCountry,
);

router.delete(
  "/:id",
  authentication(),
  authorization(["Admin", "Owner"]),
  validation(countryIdSchema),
  countryController.deleteCountry,
);

router.patch(
  "/:id/toggle-status",
  authentication(),
  authorization(["Admin", "Owner"]),
  validation(toggleStatusSchema),
  countryController.toggleCountryStatus,
);

router.patch(
  "/:id/set-default",
  authentication(),
  authorization(["Admin", "Owner"]),
  validation(countryIdSchema),
  countryController.setDefaultCountry,
);

router.get("/", countryController.getAllCountries);
router.get("/default", countryController.getDefaultCountry);
router.get("/active", countryController.getActiveCountries);
router.get("/validate", countryController.validateCountry);
router.get(
  "/:id",
  validation(countryIdSchema),
  countryController.getCountryById,
);

export default router;
