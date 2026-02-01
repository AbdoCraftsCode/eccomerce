import { Router } from "express";
import { validation } from "../../middlewere/validation.middlewere.js";
import {
  authentication,
  authorization,
} from "../../middlewere/authontcation.middlewere.js";
import * as offerController from "./offerController.js";
import * as offerValidators from "./offerValidation.js";
import {
  fileValidationTypes,
  uploadCloudFile,
} from "../../utlis/multer/cloud.multer.js";

const router = Router();

const offerUploadMiddleware = uploadCloudFile([
  ...fileValidationTypes.image,
]).fields([{ name: "images", maxCount: 10 }]);

router.post(
  "/",
  authentication(),
  authorization(["vendor"]),
  offerUploadMiddleware,
  validation(offerValidators.createOfferValidation),
  offerController.createOffer,
);

router.get(
  "/my-offers",
  authentication(),
  authorization(["vendor"]),
  validation(offerValidators.getVendorOffersValidation),
  offerController.getMyOffers,
);

router.put(
  "/update/:offerId",
  authentication(),
  authorization(["vendor"]),
  offerUploadMiddleware,
  validation(offerValidators.updateOfferValidation),
  offerController.updateOffer,
);

router.put(
  "/approve",
  authentication(),
  authorization(["Admin", "Owner"]),
  validation(offerValidators.approveOfferValidation),
  offerController.approveOffer,
);

router.get(
  "/",
  authentication(),
  validation(offerValidators.getOffersValidation),
  offerController.getOffers,
);

router.delete(
  "/:offerId",
  authentication(),
  authorization(["vendor"]),
  validation(offerValidators.deleteOfferValidation),
  offerController.deleteOffer,
);

router.get(
  "/:offerId",
  authentication(), 
  validation(offerValidators.getOfferByIdValidation), 
  offerController.getOfferById
);

export default router;
