import { removeUserSocket } from "../helpers/storeSockets.helper.js";

export const handleDisconnection = async (socket, reason) => {
  try {
    const userId = socket.user?._id?.toString();
    if (!userId) return;
    removeUserSocket(userId, socket.id);
    console.log(
      `User disconnected: ${socket.user?.fullName} (${socket.id}) - Reason: ${reason}`,
    );
  } catch (error) {
    console.error("Error handle disconnection:", error);
  }
};
