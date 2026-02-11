import mongoose from "mongoose";

const localizedStringSchema = { ar: String, en: String };

const currencyDetailsSchema = {
  code: String,
  name: { ar: String, en: String },
  symbol: String,
};

const productSnapshotSchema = {
  _id: { type: mongoose.Schema.Types.ObjectId },
  name: localizedStringSchema,
  description: localizedStringSchema,
  images: [String],
  weight: String,
  currency: currencyDetailsSchema,
  mainPrice: {
    vendor: Number,
    customer: Number,
    usd: Number,
  },
  discountPrice: {
    vendor: Number,
    customer: Number,
    usd: Number,
  },
};

const variantSnapshotSchema = {
  _id: { type: mongoose.Schema.Types.ObjectId },
  attributes: [
    {
      attributeName: localizedStringSchema,
      valueName: localizedStringSchema,
      hexCode: String,
    },
  ],
  images: [String],
  weight: String,
  mainPrice: {
    vendor: Number,
    customer: Number,
    usd: Number,
  },
  discountPrice: {
    vendor: Number,
    customer: Number,
    usd: Number,
  },
};

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
        product: productSnapshotSchema,
        variant: {
          type: variantSnapshotSchema,
          default: null,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
          validate: {
            validator: Number.isInteger,
            message: "Quantity must be integer",
          },
        },
        unitPrice: {
          vendor: { type: Number, required: true, min: 0 },
          customer: { type: Number, required: true, min: 0 },
          usd: { type: Number, required: true, min: 0 },
        },
        totalPrice: {
          vendor: { type: Number, required: true, min: 0 },
          customer: { type: Number, required: true, min: 0 },
          usd: { type: Number, required: true, min: 0 },
        },
      },
    ],
    subtotal: {
      vendor: { type: Number, required: true },
      customer: { type: Number, required: true },
      usd: { type: Number, required: true },
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
      discountValue: {
        vendor: Number,
        customer: Number,
        usd: Number,
      },
      discountValueInCustomerCurrency: Number,
      discountValueInUSD: Number,
      currency: currencyDetailsSchema,
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
          productId: mongoose.Schema.Types.ObjectId,
          variantId: mongoose.Schema.Types.ObjectId,
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
      vendor: { type: Number, required: true },
      customer: { type: Number, required: true },
      usd: { type: Number, required: true },
    },
    customerCurrency: currencyDetailsSchema,
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
