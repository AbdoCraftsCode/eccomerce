import { Router } from "express";
import { authentication } from "../../middlewere/authontcation.middlewere.js";
import { validation } from "../../middlewere/validation.middlewere.js";
import * as validations from "./profile.validation.js";
import * as controllers from "./profile.controller.js";
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
  controllers.getMyProfile,
);

router.put(
  "/",
  authentication(),
  profileUploadMiddleware,
  validation(validations.updateProfileValidation),
  controllers.updateMyProfile,
);

router.patch("/", authentication(), controllers.removeProfilePicture);

router.post(
  "/changePassword",
  authentication(),
  validation(validations.changePasswordValidation),
  controllers.changePassword,
);

router.post(
  "/confirm-email",
  authentication(),
  validation(validations.confirmEmailValidation),
  controllers.confirmEmail
);

router.get(
  "/resend-confirm-email",
  authentication(),
  validation(validations.resendConfirmEmailValidation),
  controllers.resendConfirmEmail
);

export default router;