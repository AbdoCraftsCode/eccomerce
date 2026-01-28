import { Router } from "express";
import { validation } from "../../middlewere/validation.middlewere.js";
import * as offerValidators from "./offerValidation.js";
import { authentication } from "../../middlewere/authontcation.middlewere.js";
import * as offerServices from "./services/offerService.js";
import { fileValidationTypes, uploadCloudFile } from "../../utlis/multer/cloud.multer.js";

const router = Router();

const offerUploadMiddleware = uploadCloudFile([
  ...fileValidationTypes.image,
]).fields([{ name: "images", maxCount: 10 }]);

router.post(
  "/",
  authentication(),
  offerUploadMiddleware,
  validation(offerValidators.createOfferValidation),
  offerServices.createOffer
);

router.get(
  "/my-offers",
  authentication(),
  validation(offerValidators.getVendorOffersValidation),
  offerServices.getMyOffers
);

router.put(
  "/:offerId",
  authentication(),
  offerUploadMiddleware,
  validation(offerValidators.updateOfferValidation),
  offerServices.updateOffer
);

router.put(
  "/approve",
  authentication(),
  validation(offerValidators.approveOfferValidation),
  offerServices.approveOffer
);

router.get(
  "/",
  authentication(),
  validation(offerValidators.getOffersValidation),
  offerServices.getOffers
);

router.delete(
  "/:offerId",
  authentication(),
  validation(offerValidators.deleteOfferValidation),
  offerServices.deleteOffer
);

export default router;