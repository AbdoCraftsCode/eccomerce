import { Router } from "express";
import { authentication } from "../../middlewere/authontcation.middlewere.js";
import { validation } from "../../middlewere/validation.middlewere.js";
import * as validations from "./profile.validation.js";
import * as services from "./services/profile.service.js";
import { uploadCloudFile } from "../../utlis/multer/cloud.multer.js";
import { fileValidationTypes } from "../../utlis/multer/cloud.multer.js";

const router = Router();

const profileUploadMiddleware = uploadCloudFile([
  ...fileValidationTypes.image,
]).fields([{ name: "profilePicture", maxCount: 1 }]);

router.get(
  "/",
  authentication(),
  validation(validations.getProfileValidation),
  services.getMyProfile,
);

router.put(
  "/",
  authentication(),
  profileUploadMiddleware,
  validation(validations.updateProfileValidation),
  services.updateMyProfile,
);

router.patch("/", authentication(), services.removeProfilePicture);

router.post(
  "/changePassword",
  authentication(),
  validation(validations.changePasswordValidation),
  services.changePassword,
);

router.post(
  "/confirm-email",
  authentication(),
  validation(validations.confirmEmailValidation),
  services.confirmEmail
);

router.get(
  "/resend-confirm-email",
  authentication(),
  validation(validations.resendConfirmEmailValidation),
  services.resendConfirmEmail
);

export default router;
