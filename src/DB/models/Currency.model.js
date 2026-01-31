import mongoose from "mongoose";
import { model, Schema } from "mongoose";

const currencySchema = new Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: 3,
      minlength: 3,
      validate: {
        validator: function (v) {
          return /^[A-Z]{3}$/.test(v);
        },
        message: (props) =>
          `${props.value} is not a valid ISO 4217 currency code!`,
      },
    },
    name: {
      en: {
        type: String,
        required: true,
        trim: true,
      },
      ar: {
        type: String,
        required: true,
        trim: true,
      },
    },
    symbol: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
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
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

currencySchema.virtual("displayName").get(function () {
  return this.name.en;
});

currencySchema.pre("save", async function (next) {
  if (this.isDefault && this.isModified("isDefault")) {
    await this.constructor.updateMany(
      { _id: { $ne: this._id } },
      { isDefault: false },
    );
  }
  next();
});

const Currency = model("Currency", currencySchema);
export default Currency;