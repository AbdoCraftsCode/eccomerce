import mongoose from "mongoose";

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      unique: true,
      required: true,
    },

    // ===== RELATIONS =====
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OrderUser",
      required: true,
    },

    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // ===== DATES =====
    issueDate: {
      type: Date,
      default: Date.now,
    },

    dueDate: {
      type: Date,
      required: true,
    },

    // ===== BANK SNAPSHOT =====
    bankDetails: {
      bankName: String,
      country: String,
      iban: String,
      swiftCode: String,
    },

    currency: {
      type: String,
      default: "SAR",
    },

    // ===== TOTALS =====
    subtotal: {
      type: Number,
      required: true,
    },

    discount: {
      type: Number,
      default: 0,
    },

    taxRate: {
      type: Number,
      default: 15,
    },

    taxAmount: {
      type: Number,
      required: true,
    },

    totalAmount: {
      type: Number,
      required: true,
    },

    // ===== META =====
    status: {
      type: String,
      enum: ["pending", "paid", "overdue"],
      default: "pending",
    },

    notes: String,
  },
  { timestamps: true }
);

export const InvoiceModel = mongoose.model("Invoice", invoiceSchema);
