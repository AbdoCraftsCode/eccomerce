import mongoose from "mongoose";
import { model, Schema } from "mongoose";

const sliderSchema = new Schema(
  {
    image: {
      url: { type: String, required: true, trim: true },
      public_id: { type: String, required: true, trim: true },
    },
    type: {
      type: String,
      enum: ["product", "offer", "brand", "category", "default"],
      required: true,
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

sliderSchema.pre("save", function (next) {
  if (this.type !== "default" && !this.referenceId) {
    return next(new Error("referenceId is required for non-default sliders"));
  }
  if (this.type === "default" && this.referenceId) {
    this.referenceId = null;
  }
  next();
});

// Virtual for reference (populate based on type)
sliderSchema.virtual("reference", {
  refPath: "type",
  foreignField: "_id",
  localField: "referenceId",
});

const Slider = model("Slider", sliderSchema);
export default Slider;