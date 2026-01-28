// Updated Coupon Schema - Added "category" to enum
import mongoose from "mongoose";

const couponSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        uppercase: true
    },
    discountType: {
        type: String,
        enum: ["percentage", "fixed"],
        required: true
    },
    discountValue: {
        type: Number,
        required: true,
        min: 0
    },
    appliesTo: {
        type: String,
        enum: ["single_product", "category", "all_products"],
        required: true
    },
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Producttttt",
        required: function () {
            return this.appliesTo === "single_product";
        }
    },
    categoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Categoryyyy",
        required: function () {
            return this.appliesTo === "category";
        }
    },
    vendorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
    maxUses: {
        type: Number,
        default: 1,
        min: 1
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

couponSchema.pre("save", function (next) {
    if (this.discountType === "percentage" && (this.discountValue < 0 || this.discountValue > 100)) {
        return next(new Error("قيمة الخصم النسبي يجب أن تكون بين 0 و 100"));
    }
    next();
});

export const CouponModel = mongoose.model("Coupon", couponSchema);