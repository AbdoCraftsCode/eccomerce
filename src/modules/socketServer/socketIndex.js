import { Server } from "socket.io";
import { authMiddleware } from "./middlewares/authSocket.middleware.js";
import { setupConnectionEvents } from "./events/connection.events.js";
import { setupMessageEvents } from "./events/message.events.js";

let io;

export const connectedUsers = new Map(); 

export const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: "*",
      credentials: false,
    },
  });
  io.use(authMiddleware);
  io.on("connection", (socket) => {
    setupConnectionEvents(io, socket);
    setupMessageEvents(io, socket);
  });
  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized");
  }
  return io;
};
