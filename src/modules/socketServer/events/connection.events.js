import { handleDisconnection } from "../handlers/connection.handler.js";
import {
  getUserSocket,
  setUserSocket,
} from "../helpers/storeSockets.helper.js";

export const setupConnectionEvents = (io, socket) => {
  try {
    const userId = socket.user?._id?.toString();
    const existingSocket = getUserSocket(io, userId);
    if (existingSocket) {
      console.log(`Duplicate connection blocked for user ${userId}`);
      socket.emit("connection-error", {
        message: "User already connected from another device",
      });
      socket.disconnect(true);
      return;
    }

    setUserSocket(userId, socket.id);
    console.log(`User connected: ${socket.user.username} (${socket.id})`);
    socket.emit("connection-success", {
      success: true,
      message: "Connected to chat server",
      userId: socket.user._id,
      username: socket.user.username,
    });

    socket.on("disconnect", async (reason) => {
      await handleDisconnection(socket, reason);
    });
  } catch (error) {
    console.error("Error setting up connection events:", error);
  }
};
