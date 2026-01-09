import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: {
      ar: { type: String, required: true, trim: true },
      en: { type: String, required: true, trim: true },
    },

    description: {
      ar: { type: String },
      en: { type: String },
    },

    categories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Categoryyyy",
        required: true,
      },
    ],

    brands: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Brand",
      },
    ],
    rating: {
      average: { type: Number, default: 0 },
      count: { type: Number, default: 0 },
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    sku: { type: String, unique: true },
    // barcode: { type: String, unique: true, sparse: true },

    mainPrice: { type: String },
    weight: { type: String },

    disCountPrice: { type: String },
    finalPrice: { type: String },

    images: [String],

    status: {
      type: String,
      enum: ["published", "inactive"],
      default: "published",
    },
    tax: {
      enabled: { type: Boolean, default: false },
      rate: { type: Number, default: 0 },
    },

    inStock: {
      type: Boolean,
      default: true,
    },
    unlimitedStock: {
      type: Boolean,
      default: false,
    },
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],

    bulkDiscounts: [
      {
        minQty: {
          type: Number,
          required: true,
        },
        maxQty: {
          type: Number,
          required: true,
        },
        discountPercent: {
          type: Number,
          min: 1,
          max: 100,
          required: true,
        },
      },
    ],
    currency: {
      type: String,

      default: "USD",
    },
    hasVariants: {
      type: Boolean,
      default: false,
    },

    stock: {
      type: Number,
      default: 0,
      min: 0,
    },
    seo: {
      title: String,
      description: String,
      slug: { type: String, unique: true },
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export const ProductModellll = mongoose.model("Producttttt", productSchema);
