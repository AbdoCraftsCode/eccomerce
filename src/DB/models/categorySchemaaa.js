import mongoose from "mongoose";

const categorySchema = new mongoose.Schema({
    name: {
        ar: { type: String, required: true, trim: true },
        en: { type: String, required: true, trim: true }
    },

    slug: {
        type: String,
        required: true,
        unique: true
    },

    images: [{
        type: String
    }],

    // ✅ حقل الوصف
    description: {
        ar: { type: String, trim: true },
        en: { type: String, trim: true }
    },
    comment: {
        ar: { type: String, trim: true },
        en: { type: String, trim: true }
    },

    // ✅ حقل الحالة (3 حالات فقط)
    status: {
        type: String,
        enum: ["published", "inactive", "scheduled"],
        default: "published"
    },
    parentCategory: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Categoryyyy",
        default: null
    },

    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

export const CategoryModellll = mongoose.model("Categoryyyy", categorySchema);
