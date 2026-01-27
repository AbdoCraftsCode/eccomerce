import { handleSendMessage } from "../handlers/message.handler.js";

export const setupMessageEvents = (io, socket) => {
  try {
    socket.on("send-message", async (data) => {
      await handleSendMessage(io, socket, data);
    });
  } catch (error) {
    console.error("Error setting up message events:", error);
  }
};
