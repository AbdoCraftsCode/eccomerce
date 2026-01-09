import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
    orderNumber: {
        type: String,
        unique: true,
        required: true
    },
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    vendorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    items: [{
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Producttttt",
            required: true
        },
        variantId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Variant",
            default: null
        },
        productName: {
            ar: String,
            en: String
        },
        variantAttributes: [Object], // [{ name, value, hexCode }]
        quantity: {
            type: Number,
            required: true,
            min: 1
        },
        unitPrice: Number, // السعر اللي تم البيع بيه (بعد disCountPrice)
        totalPrice: Number // unitPrice * quantity
    }],
    subtotal: {
        type: Number,
        required: true
    },
    discountAmount: {
        type: Number,
        default: 0
    },
    couponUsed: {
        couponId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Coupon",
            default: null
        },
        code: String,
        discountType: String,
        discountValue: Number
    },
    shippingCost: {
        type: Number,
        default: 0 // هيتحسب لاحقًا من Aramex
    },
    totalAmount: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        default: "USD"
    },
  
    shippingAddress: {
        fullName: String,
        phone: String,
        addressLine1: { type: String, required: true },
        addressLine2: String,
        city: { type: String, required: true },
        country: { type: String, required: true },
        postalCode: String,
        latitude: { type: Number, required: true },
        longitude: { type: Number, required: true }
    },
    // حالة الدفع
    paymentStatus: {
        type: String,
        enum: ["pending", "paid", "failed", "refunded"],
        default: "pending"
    },
    paymentMethod: {
        type: String,
        enum: ["My Ko Kart", "credit_card", "cash_on_delivery", "bank_transfer", "wallet"],
        default: "credit_card",
        required: true
    },
    paymentDetails: {
        type: mongoose.Schema.Types.Mixed, // مرن جدًا لأي بيانات إضافية
        default: {}
    },
    // حالة الشحن
    shippingStatus: {
        type: String,
        enum: ["not_shipped", "preparing", "shipped", "in_transit", "delivered", "failed"],
        default: "not_shipped"
    },
    shippingMethod: {
        type: String,
        default: "aramex"
    },
    shippingDetails: {
        trackingNumber: String,
        aramexShipmentId: String,
        shippedAt: Date,
        deliveredAt: Date
    },
    // حالة الطلب العامة
    status: {
        type: String,
        enum: ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"],
        default: "pending"
    },
    notes: String
}, { timestamps: true });

// توليد orderNumber فريد (مثل ORDER-2026-0001)
orderSchema.pre("save", async function (next) {
    if (!this.orderNumber) {
        const date = new Date();
        const year = date.getFullYear();
        const count = await this.constructor.countDocuments({
            createdAt: { $gte: new Date(year, 0, 1) }
        });
        this.orderNumber = `ORDER-${year}-${String(count + 1).padStart(4, "0")}`;
    }
    next();
});

export const OrderModelUser = mongoose.model("OrderUser", orderSchema);