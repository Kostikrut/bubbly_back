import dotenv from "dotenv";
import express from "express";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import cors from "cors";

import globalErrorHandler from "./controllers/errorController.js";
import authRoutes from "./routes/authRouter.js";
import userRoutes from "./routes/userRouter.js";
import messageRoutes from "./routes/messageRouter.js";
import AppError from "./utils/appError.js";
import connectDB from "./lib/db.js";
import { app, server } from "./lib/socket.js";

dotenv.config();
const { PORT } = process.env;

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);
// Catch uncaught exceptions if not handled
process.on("uncaughtException", (err) => {
  console.log("UNCAUGHT EXCEPTION! 💥 Shutting down...");
  console.log(err.name, err.message, err);
  process.exit(1);
});

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

app.use(express.json({ limit: "5mb" }));
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/messages", messageRoutes);

app.all("*", (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  connectDB();
});

// Catch unhandled promise rejections from entire app
process.on("unhandledRejection", (err) => {
  console.log("UNHANDLED REJECTION! 💥 Shutting down...");
  console.log(err.name, err.message, err);
  // gracefull shutdown
  server.close(() => {
    process.exit(1);
  });
});
