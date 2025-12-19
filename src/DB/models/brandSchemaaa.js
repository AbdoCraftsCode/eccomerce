import mongoose from "mongoose";

const brandSchema = new mongoose.Schema({
    categories: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Categoryyyy",
        required: true
    }],
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
