import mongoose from "mongoose";

const variantSchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Producttttt",
        required: true
    },

    color: {
        ar: String,
        en: String
    },

    size: {
        type: String // M, L, 42, 43
    },

    price: {
        type: Number,
        required: true
    },

    stock: {
        type: Number,
        required: true,
        min: 0
    },

    images: [
        {
            url: { type: String, required: true },
            public_id: { type: String, required: true },
        },
    ], // صور خاصة باللون

    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

export const VariantModel = mongoose.model("Variant", variantSchema);
