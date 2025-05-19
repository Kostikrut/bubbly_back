import { Server } from "socket.io";
import http from "http";
import express from "express";

import Message from "../models/messageModel.js";
import User from "../models/userModel.js";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173"],
  },
});

export function getRecieverSocketId(userId) {
  return userSocketMap[userId];
}

const userSocketMap = {};

io.on("connection", async (socket) => {
  const userId = socket.handshake.query.userId;
  const user = await User.findById(userId).select("showOnlineStatus");

  if (userId && user.showOnlineStatus) userSocketMap[userId] = socket.id;

  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  socket.on("typing", ({ toUserId }) => {
    const receiverSocketId = userSocketMap[toUserId];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("typing", { fromUserId: userId });
    }
  });

  socket.on("stopTyping", ({ toUserId }) => {
    const receiverSocketId = userSocketMap[toUserId];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("stopTyping", { fromUserId: userId });
    }
  });

  socket.on("markAsRead", async ({ fromUserId }) => {
    try {
      await Message.updateMany(
        { senderId: fromUserId, receiverId: userId, isRead: false },
        { $set: { isRead: true } }
      );

      // notify sender that their messages were read
      const senderSocketId = userSocketMap[fromUserId];
      if (senderSocketId) {
        io.to(senderSocketId).emit("messagesRead", { byUserId: userId });
      }
    } catch (error) {
      console.error("Failed to mark messages as read:", error);
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected", socket.id);
    delete userSocketMap[userId];
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

export { io, app, server };
