import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Producttttt",
      required: true,
    },

    variant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Variant",
      required: false,
    },

    images: [
      {
        secure_url: {
          type: String,
          required: true,
        },
        public_id: {
          type: String,
          required: true,
        },
        original_filename: String,
        uploaded_at: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      validate: {
        validator: Number.isInteger,
        message: "Rating must be an integer between 1 and 5",
      },
    },

    comment: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
  },
  {
    timestamps: true,
  }
);

reviewSchema.index(
  { user: 1, product: 1, variant: 1 },
  {
    unique: true,
    sparse: true,
  }
);

reviewSchema.index({ product: 1, createdAt: -1 });
reviewSchema.index({ user: 1, createdAt: -1 });

reviewSchema.statics.calculateProductRating = async function (productId) {
  try {
    const productObjectId = new mongoose.Types.ObjectId(productId);

    const result = await this.aggregate([
      {
        $match: {
          product: productObjectId,
        },
      },
      {
        $group: {
          _id: "$product",
          averageRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 },
        },
      },
    ]);

    if (result.length === 0) {
      return {
        average: 0,
        count: 0,
      };
    }

    return {
      average: parseFloat(result[0].averageRating.toFixed(1)),
      count: result[0].totalReviews,
    };
  } catch (error) {
    console.error("Error calculating product rating:", error);
    return {
      average: 0,
      count: 0,
    };
  }
};

reviewSchema.methods.updateProductRating = async function () {
  try {
    const ProductModel = mongoose.model("Producttttt");
    const ratingData = await this.constructor.calculateProductRating(
      this.product
    );

    await ProductModel.findByIdAndUpdate(
      this.product,
      {
        "rating.average": ratingData.average,
        "rating.count": ratingData.count,
      },
      { new: true }
    );
  } catch (error) {
    console.error("Error updating product rating:", error);
  }
};

reviewSchema.post("save", async function () {
  await this.updateProductRating();
});

reviewSchema.post("findOneAndDelete", async function (doc) {
  if (doc) {
    try {
      const ReviewModel = mongoose.model("Review");
      const ratingData = await ReviewModel.calculateProductRating(doc.product);

      const ProductModel = mongoose.model("Producttttt");
      await ProductModel.findByIdAndUpdate(doc.product, {
        "rating.average": ratingData.average,
        "rating.count": ratingData.count,
      });
    } catch (error) {
      console.error("Error updating rating after delete:", error);
    }
  }
});

export const ReviewModel = mongoose.model("Review", reviewSchema);
