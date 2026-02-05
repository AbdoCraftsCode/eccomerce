import mongoose, { Schema } from "mongoose";

const notificationSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["transactional", "marketing", "user_specific"],
      required: true,
    },
    title: {
      ar: { type: String, required: true, trim: true },
      en: { type: String, required: true, trim: true },
    },
    body: {
      ar: { type: String, required: true, trim: true },
      en: { type: String, required: true, trim: true },
    },
    image: {
      type: String,
      trim: true,
      default: null,
    },
    clickProcedure: {
      type: String,
      enum: ["no_procedure", "open_page_in_app", "open_external_link"],
      required: true,
    },
    externalLink: {
      type: String,
      trim: true,
      default: null,
    },
    audienceType: {
      type: String,
      enum: ["all_users", "saved_slide", "specific_users", "specific_filters"],
      required: true,
    },
    audienceDetails: {
      type: Schema.Types.Mixed,
      default: {},
    },
    sendAt: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "sending", "done", "failed"],
      default: "pending",
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

export const NotificationModel = mongoose.model("Notification", notificationSchema);