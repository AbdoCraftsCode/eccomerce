import mongoose from "mongoose";

const couponSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        uppercase: true // لتجنب تكرار case-sensitive
    },
    discountType: {
        type: String,
        enum: ["percentage", "fixed"],
        required: true
    },
    discountValue: {
        type: Number,
        required: true,
        min: 0 // للنسبة 0-100, للثابت 0+
    },
    appliesTo: {
        type: String,
        enum: ["single_product", "all_products"],
        required: true
    },
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Producttttt",
        required: function () {
            return this.appliesTo === "single_product";
        }
    },
    vendorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    maxUses: {
        type: Number,
        default: 1,
        min: 1 // على الأقل مرة واحدة
    },
    usesCount: {
        type: Number,
        default: 0
    },
    expiryDate: {
        type: Date
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

// ✅ التحقق من أن discountValue مناسب حسب النوع (اختياري: validation)
couponSchema.pre("save", function (next) {
    if (this.discountType === "percentage" && (this.discountValue < 0 || this.discountValue > 100)) {
        return next(new Error("قيمة الخصم النسبي يجب أن تكون بين 0 و 100"));
    }
    next();
});

export const CouponModel = mongoose.model("Coupon", couponSchema);