import mongoose from "mongoose";

const brandSchema = new mongoose.Schema({
    name: {
        ar: { type: String, required: true, trim: true },
        en: { type: String, required: true, trim: true }
    },
    description: {
        ar: { type: String, trim: true },
        en: { type: String, trim: true }
    },
    image: {
        url: { type: String, required: true },
        public_id: { type: String, required: true }
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

export const BrandModel = mongoose.model("Brand", brandSchema);