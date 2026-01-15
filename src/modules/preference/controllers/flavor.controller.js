// controllers/flavor.controller.js
import { Router } from 'express';
import { authentication, authorization } from "../../../middlewere/authontcation.middlewere.js";
import { validation } from '../../../middlewere/validation.middlewere.js';
import * as validations from '../preference.validations.js';
import * as services from '../services/flavor.service.js';

const router = Router();

// Admin only routes
router.post(
  '/create',
  authentication(),
//   authorization(['admin', 'manager']),
  validation(validations.createFlavorValidation),
  services.createFlavor
);

router.put(
  '/update',
  authentication(),
//   authorization(['admin', 'manager']),
  validation(validations.updateFlavorValidation),
  services.updateFlavor
);

router.delete(
  '/delete',
  authentication(),
//   authorization(['admin', 'manager']),
  validation(validations.deletePreferenceValidation),
  services.deleteFlavor
);

router.get(
  '/',
  validation(validations.getPreferencesValidation),
  services.getFlavors
);

router.get(
  '/:id',
  // validation(validations.getPreferencesValidation),
  services.getFlavorById
);

export default router;