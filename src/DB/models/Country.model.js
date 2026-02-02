import mongoose from "mongoose";
import { model, Schema } from "mongoose";

const countrySchema = new Schema(
  {
    name: {
      en: { type: String, required: true, trim: true, unique: true },
      ar: { type: String, required: true, trim: true },
    },
    phoneCode: {
      type: String,
      required: true,
      trim: true,
      unique: false,
    },
    flag: {
      type: String,
      required: true,
      trim: true,
    },
    isActive: { type: Boolean, default: true },
    isDefault: { type: Boolean, default: false },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);



countrySchema.pre("save", async function (next) {
  if (this.isDefault && this.isModified("isDefault")) {
    await this.constructor.updateMany(
      { _id: { $ne: this._id } },
      { isDefault: false }
    );
  }
  next();
});

const Country = model("Country", countrySchema);
export default Country;