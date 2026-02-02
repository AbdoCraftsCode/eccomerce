import mongoose, { Schema } from "mongoose";

const faqSchema = new Schema(
  {
    question: {
      ar: { type: String, required: true, trim: true },
      en: { type: String, required: true, trim: true },
    },
    answer: {
      ar: { type: String, required: true, trim: true },
      en: { type: String, required: true, trim: true },
    },
    category: {
      type: String,
      enum: ["general", "account", "service", "payment"],
      required: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

export const FaqModel = mongoose.model("Faq", faqSchema);