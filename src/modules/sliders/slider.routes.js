import { Router } from "express";
import { validation } from "../../middlewere/validation.middlewere.js";
import { authentication, authorization } from "../../middlewere/authontcation.middlewere.js";
import * as sliderController from "./slider.controller.js";
import * as sliderValidators from "./slider.validation.js";
import { fileValidationTypes, uploadCloudFile } from "../../utlis/multer/cloud.multer.js";

const router = Router();

const sliderUploadMiddleware = uploadCloudFile([
  ...fileValidationTypes.image,
]).single("image"); 

router.post(
  "/",
  authentication(),
  authorization(["Admin"]),
  sliderUploadMiddleware,
  validation(sliderValidators.createSliderValidation),
  sliderController.createSlider
);

router.put(
  "/:sliderId",
  authentication(),
  authorization(["Admin"]),
  sliderUploadMiddleware,
  validation(sliderValidators.updateSliderValidation),
  sliderController.updateSlider
);

router.delete(
  "/:sliderId",
  authentication(),
  authorization(["Admin"]),
  validation(sliderValidators.deleteSliderValidation),
  sliderController.deleteSlider
);

router.get(
  "/",
  authentication(),
  validation(sliderValidators.getSlidersValidation),
  sliderController.getSliders
);

export default router;