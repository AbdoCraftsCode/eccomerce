import mongoose from "mongoose";

const offerProductSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Producttttt",
    required: true,
  },
  variantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Variant",
  },
  quantity: {
    type: Number,
    default: 1,
    min: 1,
  },
});

const offerSchema = new mongoose.Schema(
  {
    name: {
      ar: { type: String, required: true, trim: true },
      en: { type: String, required: true, trim: true },
    },
    description: {
      ar: { type: String },
      en: { type: String },
    },
    images: [
      {
        url: { type: String, required: true },
        public_id: { type: String, required: true },
      },
    ],
    products: [offerProductSchema],
    offerPrice: {
      type: Number,
      required: true,
    },
    currency: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Currency",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "active", "expired", "rejected"],
      default: "pending",
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true },
);

offerSchema.index({ status: 1, endDate: 1 });
offerSchema.index({ createdBy: 1, status: 1 });

export const OfferModel = mongoose.model("Offer", offerSchema);
