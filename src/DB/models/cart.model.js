import mongoose from "mongoose";

const cartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Producttttt",
    required: true,
  },

  variant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Variant",
  },

  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1,
  },
});

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    items: [cartItemSchema],

    totalItems: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

cartSchema.index({ user: 1 }, { unique: true });


cartSchema.pre("save", async function (next) {
  this.totalItems = this.items.reduce((sum, item) => sum + item.quantity, 0);
  next();
});

export const CartModel = mongoose.model("Cart", cartSchema);
