import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      trim: true,
      default: "",
    },
    voice: {
      url: { type: String },
      public_id: { type: String },
      duration: { type: Number },
    },
    image: {
      url: { type: String },
      public_id: { type: String },
    },
    senderType: {
      type: String,
      enum: ["user", "admin"],
      required: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "messages.senderTypeModel",
    },
    type: {
      type: String,
      enum: ["text", "image", "voice"],
      required: true,
    },
  },
  { timestamps: true },
);

const contactChatSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    lastMessageSentAt: {
      type: Date,
      default: null,
    },
    messages: [messageSchema],
  },
  {
    timestamps: true,
  },
);

contactChatSchema.index({ user: 1 }, { unique: true });
contactChatSchema.index({ "messages.createdAt": -1 });
contactChatSchema.index({ updatedAt: -1 });
contactChatSchema.index({ lastMessageSentAt: -1 });

export const ContactChatModel = mongoose.model(
  "ContactChat",
  contactChatSchema,
);
