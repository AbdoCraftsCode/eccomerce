// review.controller.js
import { Router } from "express";
import {
  authentication,
  authorization,
} from "../../middlewere/authontcation.middlewere.js";
import { validation } from "../../middlewere/validation.middlewere.js";
import { endpoint } from "./review.authrize.js";
import * as reviewValidators from "./review.validation.js";
import { fileValidationTypes, uploadCloudFile } from "../../utlis/multer/cloud.multer.js";
import * as reviewServices from "./services/review.service.js";


const router = Router();


const reviewUploadMiddleware = uploadCloudFile([
  ...fileValidationTypes.image, 
]).fields([
  { name: "images", maxCount: 5 }, 
]);

router.post(
  "/create",
  authentication(),
  reviewUploadMiddleware, 
  validation(reviewValidators.createReviewValidation),
  reviewServices.createReview
);

router.put(
  "/update",
  authentication(),
  reviewUploadMiddleware, 
  validation(reviewValidators.updateReviewValidation),
  reviewServices.updateReview
);



router.delete(
  "/delete",
  authentication(),
  validation(reviewValidators.deleteReviewValidation),
  reviewServices.deleteReview
);

router.delete(
  "/delete-images",
  authentication(),
  validation(reviewValidators.deleteReviewImagesValidation),
  reviewServices.deleteReviewImagesByIds
);

router.get(
  "/get/:reviewId",
  authentication([], endpoint.getSingle),
  validation(reviewValidators.getReviewValidation),
  reviewServices.getReviewById
);

router.get(
  "/product/:productId",
  authentication([], endpoint.getProductReviews),
  validation(reviewValidators.getProductReviewsValidation),
  reviewServices.getProductReviews
);

router.get("/my-reviews", authentication(), reviewServices.getMyReviews);

router.get(
  "/summary/:productId",
  authentication([], endpoint.getProductReviews),
  validation(reviewValidators.getProductReviewsValidation),
  reviewServices.getProductRatingSummary
);

export default router;
