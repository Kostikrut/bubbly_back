import express from "express";

import { protect } from "../controllers/authController.js";
import { downloadChatData } from "../controllers/downloadController.js";
import {
  updateUser,
  updateProfilePic,
  getAllUsers,
  setChatWallpaper,
  getContacts,
  searchUsers,
  addToContacts,
  removeFromContacts,
  getBlockedUsers,
  blockUser,
  unblockUser,
  updateOnlineStatus,
} from "../controllers/userController.js";

const router = express.Router();

router.patch("/updateUser", protect, updateUser);
router.patch("/updateOnlineStatus", protect, updateOnlineStatus);
router.patch("/updateProfilePic", protect, updateProfilePic);
router.get("/allUsers", protect, getAllUsers);
router.get("/blockedUsers", protect, getBlockedUsers);
router.get("/searchUsers", protect, searchUsers);
router.get("/contacts", protect, getContacts);
router.put("/contacts/:id", protect, addToContacts);
router.delete("/contacts/:id", protect, removeFromContacts);
router.put("/block/:id", protect, blockUser);
router.put("/unblock/:id", protect, unblockUser);
router.post("/setChatWallpaper", protect, setChatWallpaper);
router.get("/export", protect, downloadChatData);

export default router;
