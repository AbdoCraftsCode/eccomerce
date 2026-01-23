import mongoose from "mongoose";

const subOrderSchema = new mongoose.Schema(
  {
    subOrderNumber: {
      type: String,
      unique: true,
      required: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OrderUser",
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
        variantAttributes: [
          {
            attributeId: mongoose.Schema.Types.ObjectId,
            valueId: mongoose.Schema.Types.ObjectId,
            attributeName: { en: String, ar: String },
            valueName: { en: String, ar: String },
          },
        ],
        quantity: {
          type: Number,
          required: true,
          min: 1,
          validate: {
            validator: Number.isInteger,
            message: "Quantity must be integer",
          },
        },
        // Removed vendorAddress
        unitPrice: {
          type: Number,
          required: true,
          min: 0,
        },
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
      discountType: {
        type: String,
        enum: ["percentage", "fixed"],
      },
      discountValue: Number,
      appliesTo: {
        type: String,
        enum: ["single_product", "category", "all_products"],
      },
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Producttttt",
        default: null,
      },
      categoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
        default: null,
      },
      vendorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
      applicableSubtotal: {
        type: Number,
        default: 0,
      },
      appliedItems: [
        {
          productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Producttttt",
          },
          variantId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Variant",
            default: null,
          },
          quantity: Number,
          unitPrice: Number,
          itemTotal: Number,
        },
      ],
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
      enum: ["My Ko Kart", "credit_card", "cash_on_delivery"],
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
  { timestamps: true },
);

subOrderSchema.index({ vendorId: 1, status: 1, createdAt: 1 });
subOrderSchema.index({ orderId: 1 });
subOrderSchema.index({ paymentStatus: 1, shippingStatus: 1 });


export const SubOrderModel = mongoose.model("SubOrder", subOrderSchema);
