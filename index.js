import express from "express";
import bootstap from "./src/app.controller.js";
import path from "node:path";
import dotenv from "dotenv";
dotenv.config({ path: path.resolve("./src/config/.env") });
console.log("🔹 JWT_SECRET:", process.env.JWT_SECRET);
import { startOrderCleanupJob } from "./src/modules/orders/services/cleanup.service.js";
import { initializeSocket } from "./src/modules/socketServer/socketIndex.js";
import http from "http";

const app = express();
const port = process.env.PORT || 3000;

const server = http.createServer(app);

console.log("Email:", process.env.EMAIL);
console.log("Password exists?", !!process.env.EMAIL_PASSWORD);
bootstap(app, express);

const io = initializeSocket(server);

startOrderCleanupJob();

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});

server.listen(port, () => {
  console.log(`🚀 Server is running on port ${port}`);
  console.log(`📡 Socket.io server initialized`);
});
