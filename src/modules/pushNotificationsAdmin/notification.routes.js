import { Router } from "express";
import { validation } from "../../middlewere/validation.middlewere.js";
import { authentication, authorization } from "../../middlewere/authontcation.middlewere.js";
import * as notificationController from "./notification.controller.js";
import * as notificationValidators from "./notification.validation.js";
import { fileValidationTypes, uploadCloudFile } from "../../utlis/multer/cloud.multer.js";

const router = Router();

const notificationUploadMiddleware = uploadCloudFile([
  ...fileValidationTypes.image,
]).single("image"); 

router.post(
  "/",
  authentication(),
  authorization(["Admin"]),
  notificationUploadMiddleware,
  validation(notificationValidators.createNotificationValidation),
  notificationController.createNotification
);


router.get(
  "/",
  authentication(),
  authorization(["Admin"]),
  validation(notificationValidators.getNotificationsValidation),
  notificationController.getNotifications
);

router.get(
  "/stats",
  authentication(),
  authorization(["Admin"]),
  notificationController.getNotificationStats
);

export default router;