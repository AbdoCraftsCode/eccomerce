import mongoose, { Schema, Types, model } from "mongoose";

export const roletypes = { User: "User", Admin: "Admin", Owner: "Owner" };
export const providerTypes = { system: "system", google: "google" };

const AddressSchema = new mongoose.Schema(
  {
    addressName: { type: String, required: true },

    addressDetails: { type: String, required: true },

    isDefault: {
      type: Boolean,
      default: false,
    },

    latitude: {
      type: Number,
      required: true,
      min: -90,
      max: 90,
    },
    longitude: {
      type: Number,
      required: true,
      min: -180,
      max: 180,
    },
  },
  { _id: true },
);

const userSchema = new Schema(
  {
    fullName: { type: String, required: true },

    email: { type: String, sparse: true, trim: true },
    phone: { type: String, sparse: true, trim: true },

    companyName: { type: String, sparse: true, trim: true },
    categories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Categoryyyy",
        required: true,
      },
    ],

    Addresses: {
      type: [AddressSchema],
      default: [],
    },

    password: { type: String },

    status: {
      type: String,
      enum: ["PENDING", "REFUSED", "ACCEPTED"],
      default: "PENDING",
    },

    country: { type: String },
    currency: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Currency",
    },
    lang: { type: String },
    weight: { type: String },
    height: { type: String },
    preferredFlavor: { type: mongoose.Schema.Types.ObjectId }, //
    favoritePopgroup: { type: mongoose.Schema.Types.ObjectId },
    productType: { type: mongoose.Schema.Types.ObjectId },

    role: { type: String },

    isConfirmed: { type: Boolean, default: false },
    carNumber: { type: Number, default: 0 },

    accountType: {
      type: String,
      enum: ["User", "ServiceProvider", "Owner", "manager", "vendor", "Admin"],
      required: true,
    },

    serviceType: {
      type: String,
      enum: ["Driver", "Doctor", "Host", "Delivery"],
      default: null,
    },

    serviceRef: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "serviceTypeRef",
    },

    serviceTypeRef: {
      type: String,
      enum: [
        "DriverProfile",
        "DoctorProfile",
        "HostProfile",
        "DeliveryProfile",
      ],
    },
    fcmToken: { type: String, default: null },

    userId: String,
    emailOTP: String,
    forgetpasswordOTP: String,
    attemptCount: Number,
    otpExpiresAt: Date,
    blockUntil: { type: Date },

    profiePicture: {
      secure_url: { type: String, default: null },
      public_id: { type: String, default: null },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);
userSchema.virtual("subscriptionDaysLeft").get(function () {
  if (!this.subscription?.endDate) return null;
  const diff = Math.ceil(
    (this.subscription.endDate - new Date()) / (1000 * 60 * 60 * 24),
  );
  return diff > 0 ? diff : 0;
});

userSchema.virtual("subscriptionDaysUsed").get(function () {
  if (!this.subscription?.startDate) return null;
  const diff = Math.ceil(
    (new Date() - this.subscription.startDate) / (1000 * 60 * 60 * 24),
  );
  return diff > 0 ? diff : 0;
});

const Usermodel = mongoose.model("User", userSchema);
userSchema.index({ location: "2dsphere" });
export default Usermodel;

export const scketConnections = new Map();
export const onlineUsers = new Map();
