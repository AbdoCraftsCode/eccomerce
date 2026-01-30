import mongoose from "mongoose";

const categoryRequestSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true 
    },
    categoryType: {
        type: String,
        enum: ["main", "sub"], 
        required: true
    },
    parentCategoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Categoryyyy",
        required: function () { return this.categoryType === "sub"; } 
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
    rejectionReason: { type: String }, 
    createdCategoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Categoryyyy",
        default: null 
    }
}, { timestamps: true });

export const CategoryRequestModel = mongoose.model("CategoryRequest", categoryRequestSchema);