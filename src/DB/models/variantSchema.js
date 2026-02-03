import mongoose from "mongoose";

const variantSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Producttttt",
      required: true,
    },
    attributes: [
      {
        attributeId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Attributee",
          required: true,
        },
        valueId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "AttributeValue",
          required: true,
        },
      },
    ],
    price: {
      type: Number,
      required: true,
    },
    stock: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: "Stock must be integer",
      },
    },
    reservedStock: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: "Reserved stock must be integer",
      },
    },
    weight: { type: String },
    sku: { type: String, unique: true },
    disCountPrice: { type: String },
    images: [
      {
        url: String,
        public_id: String,
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    offerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Offer",
    },
    offerStart: {
      type: Date,
    },
    offerEnd: {
      type: Date,
    },
    offerStatus: {
      type: String,
      enum: ["pending", "approved"],
    },
  },
  { timestamps: true },
);

export const VariantModel = mongoose.model("Variant", variantSchema);
