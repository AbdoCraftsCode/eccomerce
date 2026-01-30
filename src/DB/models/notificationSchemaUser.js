import mongoose from "mongoose";
const notificationSchema = new mongoose.Schema({
    recipientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true 
    },
    type: {
        type: String,
        enum: ["category_request", "order_new", "payment", "other"], 
        required: true
    },
    title: {
        ar: String,
        en: String
    },
    message: {
        ar: String,
        en: String
    },
    data: { type: mongoose.Schema.Types.Mixed }, 
    isRead: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

export const NotificationModelUser = mongoose.model("Notificationuser", notificationSchema);