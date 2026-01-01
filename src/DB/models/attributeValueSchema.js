import mongoose from "mongoose";

const attributeValueSchema = new mongoose.Schema({
    attributeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Attributee",
        required: true
    },

    value: {
        ar: { type: String, required: true },
        en: { type: String, required: true }
    },

  createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User", 
            required: true
        },
    hexCode: String, // خاص بالألوان

    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

export const AttributeValueModel = mongoose.model("AttributeValue", attributeValueSchema);
  
