import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
    name: {
        ar: { type: String, required: true, trim: true },
        en: { type: String, required: true, trim: true }
    },

    description: {
        ar: { type: String },
        en: { type: String }
    },

    categories: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Categoryyyy",
        required: true
    }],
    rating: {
        average: { type: Number, default: 0 },
        count: { type: Number, default: 0 }
    },

    images: [String], // صور عامة للمنتج

    status: {
        type: String,
        enum: ["available", "out_of_stock", "hidden"],
        default: "available"
    },

    seo: {
        title: String,
        description: String,
        slug: { type: String, unique: true }
    },

    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

export const ProductModellll = mongoose.model("Producttttt", productSchema);
