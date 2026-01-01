import mongoose from "mongoose";

const variantSchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Producttttt",
        required: true
    },

    attributes: [{
        attributeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Attributee",
            required: true
        },
        valueId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "AttributeValue",
            required: true
        }
    }],

    price: {
        type: Number,
        required: true
    },

    stock: {
        type: Number,
        required: true,
        min: 0
    },

    sku: { type: String, unique: true },
    disCountPrice: { type: String, },
    images: [{
        url: String,
        public_id: String
    }],

    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

export const VariantModel = mongoose.model("Variant", variantSchema);

