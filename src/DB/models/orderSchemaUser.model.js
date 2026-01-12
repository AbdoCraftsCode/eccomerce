// orderSchemaUser.model.js
import mongoose from "mongoose";
// import {releaseStockFromExpiredOrder} from "../../modules/orders/services/cleanup.service"

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
      required: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Producttttt",
          required: true,
        },
        variantId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Variant",
          default: null,
        },
        productName: {
          ar: String,
          en: String,
        },
        variantAttributes: [{ name: String, value: String, hexCode: String }], // Consistent array
        quantity: {
          type: Number,
          required: true,
          min: 1,
          validate: {
            validator: Number.isInteger,
            message: "Quantity must be integer",
          },
        },
        vendorAddress: {
          addressName: String,
          addressDetails: String,
          latitude: { type: Number, required: true },
          longitude: { type: Number, required: true },
        },
        unitPrice: Number,
        totalPrice: Number,
      },
    ],
    subtotal: {
      type: Number,
      required: true,
    },
    discountAmount: {
      type: Number,
      default: 0,
    },
    couponUsed: {
      couponId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Coupon",
        default: null,
      },
      code: String,
      discountType: String,
      discountValue: Number,
    },
    shippingCost: {
      type: Number,
      default: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: "USD",
    },
    shippingAddress: {
      addressName: String,
      addressDetails: String,
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },
    paymentMethod: {
      type: String,
      enum: ["My Ko Kart", "credit_card"],
      default: "credit_card",
      required: true,
    },
    paymentDetails: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    shippingStatus: {
      type: String,
      enum: [
        "not_shipped",
        "preparing",
        "shipped",
        "in_transit",
        "delivered",
        "failed",
      ],
      default: "not_shipped",
    },
    shippingMethod: {
      type: String,
      default: "aramex",
    },
    shippingDetails: {
      trackingNumber: String,
      aramexShipmentId: String,
      shippedAt: Date,
      deliveredAt: Date,
    },
    expireAt: {
      type: Date,
      default: () => new Date(Date.now() + 60 * 60 * 1000),
    },
    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
      ],
      default: "pending",
    },
    notes: String,
  },
  { timestamps: true }
);

orderSchema.index({ paymentStatus: 1, status: 1, expireAt: 1 });

orderSchema.pre("validate", async function (next) {
  if (!this.orderNumber) {
    const date = new Date();
    const year = date.getFullYear();
    const count = await this.constructor.countDocuments({
      createdAt: { $gte: new Date(year, 0, 1) },
    });
    this.orderNumber = `ORDER-${year}-${String(count + 1).padStart(4, "0")}`;
  }
  next();
});


export const OrderModelUser = mongoose.model("OrderUser", orderSchema);
