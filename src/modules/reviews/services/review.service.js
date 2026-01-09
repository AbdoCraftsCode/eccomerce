import { asyncHandelr } from "../../../utlis/response/error.response.js";
import { ReviewModel } from "../../../DB/models/reviewSchema.model.js";
import { ProductModellll } from "../../../DB/models/productSchemaaaa.js";
import { VariantModel } from "../../../DB/models/variantSchema.js";
import mongoose from "mongoose";
import {
  uploadReviewImages,
  deleteReviewImages,
  cleanupUnusedImages,
} from "./helper.service.js";

export const createReview = asyncHandelr(async (req, res, next) => {
  const userId = req.user._id;
  const { productId, variantId, rating, comment } = req.body;

  console.log(req.body);

  // Validate product
  const product = await ProductModellll.findById(productId);
  if (!product) {
    return next(new Error("Product not found", { cause: 404 }));
  }

  // Validate variant if provided
  if (variantId) {
    const variant = await VariantModel.findOne({
      _id: variantId,
      productId: productId,
    });
    if (!variant) {
      return next(
        new Error("Variant not found for this product", { cause: 404 })
      );
    }
  }

  // Check for existing review
  const existingReview = await ReviewModel.findOne({
    user: userId,
    product: productId,
    variant: variantId || null,
  });

  if (existingReview) {
    return next(
      new Error("You have already reviewed this product", { cause: 400 })
    );
  }

  // Upload review images if any
  let uploadedImages = [];
  if (req.files?.images) {
    try {
      uploadedImages = await uploadReviewImages(req.files);
    } catch (error) {
      return next(new Error("Failed to upload review images", { cause: 500 }));
    }
  }

  // Create review
  const review = await ReviewModel.create({
    user: userId,
    product: productId,
    variant: variantId || null,
    rating,
    comment,
    images: uploadedImages,
  });

  res.status(201).json({
    success: true,
    message: "Review created successfully",
    data: review,
  });
});

export const updateReview = asyncHandelr(async (req, res, next) => {
  const userId = req.user._id;
  const { reviewId, rating, comment } = req.body;

  // Find review
  const review = await ReviewModel.findById(reviewId);
  if (!review) {
    return next(new Error("Review not found", { cause: 404 }));
  }

  // Check ownership
  if (review.user.toString() !== userId.toString()) {
    return next(
      new Error("Unauthorized to update this review", { cause: 403 })
    );
  }

  // Track current images before update
  const currentImages = review.images || [];
  let updatedImages = [...currentImages];

  // Handle new image uploads
  if (req.files?.images) {
    try {
      const newImages = await uploadReviewImages(req.files);
      updatedImages = [...updatedImages, ...newImages];
    } catch (error) {
      return next(
        new Error("Failed to upload new review images", { cause: 500 })
      );
    }
  }

  // Update fields
  const updates = {};
  if (rating !== undefined) updates.rating = rating;
  if (comment !== undefined) updates.comment = comment;
  updates.images = updatedImages;

  // Update the review
  const updatedReview = await ReviewModel.findByIdAndUpdate(reviewId, updates, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    message: "Review updated successfully",
    data: updatedReview,
  });
});

export const deleteReview = asyncHandelr(async (req, res, next) => {
  const userId = req.user._id;
  const { reviewId } = req.body;

  const review = await ReviewModel.findById(reviewId);
  if (!review) {
    return next(new Error("Review not found", { cause: 404 }));
  }

  if (
    review.user.toString() !== userId.toString() &&
    !["Admin", "Owner"].includes(req.user.accountType)
  ) {
    return next(
      new Error("Unauthorized to delete this review", { cause: 403 })
    );
  }

  // Delete images from Cloudinary before deleting the review
  if (review.images && review.images.length > 0) {
    await deleteReviewImages(review.images);
  }

  // Delete the review from database
  await ReviewModel.findByIdAndDelete(reviewId);

  res.status(200).json({
    success: true,
    message: "Review deleted successfully",
  });
});

export const getReviewById = asyncHandelr(async (req, res, next) => {
  const { reviewId } = req.params;

  const review = await ReviewModel.findById(reviewId)
    .populate("user", "fullName profilePicture")
    .populate("product", "name")
    .populate("variant", "attributes");

  if (!review) {
    return next(new Error("Review not found", { cause: 404 }));
  }

  res.status(200).json({
    success: true,
    data: review,
  });
});

export const deleteReviewImagesByIds = asyncHandelr(async (req, res, next) => {
  const userId = req.user._id;
  const { reviewId, imageIds } = req.body;

  const review = await ReviewModel.findById(reviewId);
  if (!review) {
    return next(new Error("Review not found", { cause: 404 }));
  }

  if (review.user.toString() !== userId.toString()) {
    return next(
      new Error("Unauthorized to modify this review", { cause: 403 })
    );
  }

  const imagesToDelete = review.images.filter(
    (img) =>
      imageIds.includes(img.public_id) || imageIds.includes(img._id.toString())
  );

  if (imagesToDelete.length === 0) {
    return next(
      new Error("No matching images found to delete", { cause: 400 })
    );
  }

  const remainingImages = review.images.filter(
    (img) =>
      !imageIds.includes(img.public_id) &&
      !imageIds.includes(img._id.toString())
  );

  review.images = remainingImages;
  await review.save();

  await deleteReviewImages(imagesToDelete);

  res.status(200).json({
    success: true,
    message: "Images deleted successfully",
    data: review,
  });
});

export const getProductReviews = asyncHandelr(async (req, res, next) => {
  const { productId } = req.params;
  const { page = 1, limit = 10, rating, sortBy = "newest" } = req.query;

  const skip = (page - 1) * limit;

  // Build filter
  const filter = { product: productId };

  if (rating) {
    filter.rating = parseInt(rating);
  }

  let sort = {};
  switch (sortBy) {
    case "newest":
      sort = { createdAt: -1 };
      break;
    case "oldest":
      sort = { createdAt: 1 };
      break;
    case "highest":
      sort = { rating: -1 };
      break;
    case "lowest":
      sort = { rating: 1 };
      break;
    default:
      sort = { createdAt: -1 };
  }

  const reviews = await ReviewModel.find(filter)
    .populate("user", "fullName profilePicture")
    .populate("variant", "attributes")
    .sort(sort)
    .skip(skip)
    .limit(parseInt(limit))
    .lean();

  const total = await ReviewModel.countDocuments(filter);

  // Get product rating
  const product = await ProductModellll.findById(productId)
    .select("rating name")
    .lean();

  res.status(200).json({
    success: true,
    data: reviews,
    productRating: product.rating,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

export const getMyReviews = asyncHandelr(async (req, res, next) => {
  const userId = req.user._id;
  const { page = 1, limit = 10 } = req.query;

  const skip = (page - 1) * limit;

  const reviews = await ReviewModel.find({ user: userId })
    .populate("product", "name images")
    .populate("variant", "attributes")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .lean();

  const total = await ReviewModel.countDocuments({ user: userId });

  res.status(200).json({
    success: true,
    data: reviews,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

export const getProductRatingSummary = asyncHandelr(async (req, res, next) => {
  const { productId } = req.params;

  console.log("=== DEBUG START ===");
  console.log("Product ID:", productId);
  console.log("Is valid ObjectId?", mongoose.Types.ObjectId.isValid(productId));

  try {
    // Test with a simpler aggregation first
    const ratingDistribution = await ReviewModel.aggregate([
      {
        $match: {
          product: new mongoose.Types.ObjectId(productId),
        },
      },
      {
        $group: {
          _id: "$rating",
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: -1 },
      },
    ]);

    console.log(
      "Aggregation result:",
      JSON.stringify(ratingDistribution, null, 2)
    );

    const product = await ProductModellll.findById(productId)
      .select("rating name")
      .lean();

    console.log("Product found:", product);

    if (!product) {
      return next(new Error("Product not found", { cause: 404 }));
    }

    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    ratingDistribution.forEach((item) => {
      distribution[item._id] = item.count;
    });

    console.log("Final distribution:", distribution);

    res.status(200).json({
      success: true,
      data: {
        averageRating: product.rating?.average || 0,
        totalReviews: product.rating?.count || 0,
        distribution,
      },
    });

    console.log("=== DEBUG END ===");
  } catch (error) {
    console.error("=== AGGREGATION ERROR ===");
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    console.error("Full error:", error);
    console.log("=== DEBUG END ===");

    return next(
      new Error("Error calculating rating summary: " + error.message, {
        cause: 500,
      })
    );
  }
});

// want more work
export const canUserReviewProduct = async (userId, productId) => {
  return true;
};
