import express from "express";

import {
  getMessages,
  sendMessage,
  deleteManyMessages,
} from "../controllers/messageController.js";
import { protect } from "../controllers/authController.js";

const router = express.Router();

router.get("/:id", protect, getMessages);
router.post("/:id", protect, sendMessage);
router.patch("/deleteMany", protect, deleteManyMessages);

export default router;
