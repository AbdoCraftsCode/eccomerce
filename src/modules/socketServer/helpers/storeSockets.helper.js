import { connectedUsers } from "../socketIndex.js"

export const setUserSocket = (userId, socketId) => {
  connectedUsers.set(userId, socketId);
};

export const removeUserSocket = (userId, socketId) => {
  const storedSocketId = connectedUsers.get(userId);

  if (storedSocketId === socketId) {
    connectedUsers.delete(userId);
  }
};

export const getUserSocket = (io, userId) => {
  const socketId = connectedUsers.get(userId);
  if (!socketId) return null;

  return io.sockets.sockets.get(socketId) || null;
};
