// controllers/productType.controller.js
import { Router } from 'express';
import { authentication, authorization } from "../../../middlewere/authontcation.middlewere.js";
import { validation } from '../../../middlewere/validation.middlewere.js';
import * as validations from '../preference.validations.js';
import * as services from '../services/productType.service.js';

const router = Router();


router.post(
  '/create',
  authentication(),
//   authorization(['admin', 'manager']),
  validation(validations.createProductTypeValidation),
  services.createProductType
);

router.put(
  '/update',
  authentication(),
//   authorization(['admin', 'manager']),
  validation(validations.updateProductTypeValidation),
  services.updateProductType
);

router.delete(
  '/delete',
  authentication(),
//   authorization(['admin', 'manager']),
  validation(validations.deletePreferenceValidation),
  services.deleteProductType
);

// Public routes
router.get(
  '/',
  validation(validations.getPreferencesValidation),
  services.getProductTypes
);

router.get(
  '/:id',
  // validation(validations.getPreferencesValidation),
  services.getProductTypeById
);

export default router;