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

    parentCategory: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
        default: null
    },

    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

export const CategoryModellll = mongoose.model("Categoryyyy", categorySchema);
