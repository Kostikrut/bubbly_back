import express from "express";

import {
  signup,
  logout,
  login,
  protect,
  checkAuth,
  forgotPassword,
  resetPassword,
} from "../controllers/authController.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);
router.post("/forgotPassword", forgotPassword);
router.post("/resetPassword/:token", resetPassword);
router.get("/check", protect, checkAuth);

export default router;
