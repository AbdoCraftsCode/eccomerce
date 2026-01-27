import { ContactChatModel } from "../../../DB/models/contactChatSchema.js";
import { getUserSocket } from "../helpers/storeSockets.helper.js";
import { getOrCreateUserChat } from "../../contactUs/services/contactUs.service.js";

export const handleSendMessage = async (io, socket, data) => {
  try {
    const { content, image, voice, type = "text", chatId } = data;
    const user = socket.user;
    const isAdmin = user.accountType === "admin";

    if (type === "text" && !content) {
      socket.emit("message-error", {
        success: false,
        message: "Text message requires content",
      });
      return;
    }

    if (type === "image" && !image?.url) {
      socket.emit("message-error", {
        success: false,
        message: "Image message requires image URL",
      });
      return;
    }

    if (type === "voice" && !voice?.url) {
      socket.emit("message-error", {
        success: false,
        message: "Voice message requires voice URL",
      });
      return;
    }

    let chat;

    if (isAdmin) {
      if (!chatId) {
        socket.emit("message-error", {
          success: false,
          message: "Admin must provide chatId",
        });
        return;
      }
      chat = await ContactChatModel.findById(chatId);
      if (!chat) {
        socket.emit("message-error", {
          success: false,
          message: "Chat not found",
        });
        return;
      }
    } else {
      chat = await getOrCreateUserChat(user._id);
    }

    const now = new Date();
    const message = {
      content: content || "",
      voice: voice || {},
      image: image || {},
      senderType: isAdmin ? "admin" : "user",
      senderId: user._id,
      type: type,
      createdAt: now,
    };

    chat.messages.push(message);
    chat.lastMessageSentAt = now;
    await chat.save();

    const populatedMessage = await ContactChatModel.findOne(
      { _id: chat._id, "messages._id": message._id },
      { "messages.$": 1 },
    ).populate({
      path: "messages.senderId",
      select: "name email avatar accountType",
    });

    const fullMessage = populatedMessage?.messages?.[0] || message;

    const messageData = {
      _id: fullMessage._id,
      content: fullMessage.content,
      voice: fullMessage.voice,
      image: fullMessage.image,
      senderType: fullMessage.senderType,
      senderId: fullMessage.senderId,
      type: fullMessage.type,
      createdAt: fullMessage.createdAt,
      chatId: chat._id,
    };

    if (isAdmin) {
      const userSocket = getUserSocket(io, chat.user.toString());
      if (userSocket) {
        userSocket.emit("new-message", {
          success: true,
          message: messageData,
        });
      }
      socket.emit("message-sent", {
        success: true,
        message: messageData,
      });
    } else {
      socket.emit("message-sent", {
        success: true,
        message: messageData,
      });

      const adminSockets = Array.from(io.sockets.sockets.values()).filter(
        (sock) => sock.user?.accountType === "admin",
      );

      adminSockets.forEach((adminSocket) => {
        adminSocket.emit("new-message", {
          success: true,
          message: messageData,
        });
      });
    }
  } catch (error) {
    console.error("Error sending message:", error);
    socket.emit("message-error", {
      success: false,
      message: "Failed to send message",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
