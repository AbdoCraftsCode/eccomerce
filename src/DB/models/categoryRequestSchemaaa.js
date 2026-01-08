import mongoose from "mongoose";

// Schema لطلبات إضافة الأقسام (CategoryRequests)
const categoryRequestSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true // مين اللي طلب القسم (العميل)
    },
    categoryType: {
        type: String,
        enum: ["main", "sub"], // رئيسي أو فرعي
        required: true
    },
    parentCategoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Categoryyyy",
        required: function () { return this.categoryType === "sub"; } // مطلوب لو فرعي
    },
    name: {
        ar: { type: String, required: true, trim: true },
        en: { type: String, required: true, trim: true }
    },
    description: {
        ar: { type: String, required: true },
        en: { type: String, required: true }
    },
    status: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending"
    },
    rejectionReason: { type: String }, // سبب الرفض لو رفض
    createdCategoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Categoryyyy",
        default: null // ID القسم اللي تم إنشاؤه لو تمت الموافقة
    }
}, { timestamps: true });

export const CategoryRequestModel = mongoose.model("CategoryRequest", categoryRequestSchema);