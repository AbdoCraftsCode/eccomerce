// controllers/popgroup.controller.js
import { Router } from 'express';
import { authentication, authorization } from "../../../middlewere/authontcation.middlewere.js";
import { validation } from '../../../middlewere/validation.middlewere.js';
import * as validations from '../preference.validations.js';
import * as services from '../services/popgroup.service.js';
import { fileValidationTypes, uploadCloudFile } from "../../../utlis/multer/cloud.multer.js";

const router = Router();


const popgroupUploadMiddleware = uploadCloudFile([
  ...fileValidationTypes.image 
]).fields([
  { name: 'image', maxCount: 1 }
]);


router.post(
  '/create',
  authentication(),
  popgroupUploadMiddleware, 
  validation(validations.createPopgroupValidation),
  services.createPopgroup
);

router.put(
  '/update',
  authentication(),
  popgroupUploadMiddleware,
  validation(validations.updatePopgroupValidation),
  services.updatePopgroup
);

router.delete(
  '/delete',
  authentication(),
  validation(validations.deletePreferenceValidation),
  services.deletePopgroup
);

router.put(
  '/update-image',
//   authentication(),
  popgroupUploadMiddleware,
  validation(validations.updatePopgroupImageValidation),
  services.updatePopgroupImage
);

// Remove image only
router.delete(
  '/remove-image',
//   authentication(),
  validation(validations.removePopgroupImageValidation),
  services.removePopgroupImage
);


router.get(
  '/',
  validation(validations.getPreferencesValidation),
  services.getPopgroups
);

router.get(
  '/:id',
  // validation(validations.getPreferencesValidation),
  services.getPopgroupById
);

export default router;