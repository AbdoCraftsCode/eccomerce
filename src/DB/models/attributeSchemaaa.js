import mongoose from "mongoose";

const attributeSchema = new mongoose.Schema(
  {
    name: {
      ar: { type: String, required: true },
      en: { type: String, required: true },
    },

    type: {
      type: String,

      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

export const AttributeModell = mongoose.model("Attributee", attributeSchema);
