import jwt from "jsonwebtoken";
import crypto from "crypto";
import { promisify } from "util";

import { sendEmail } from "../lib/email.js";
import { createSendToken } from "../lib/jwt.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import User from "../models/userModel.js";

const signup = catchAsync(async (req, res, next) => {
  const { name, email, nickname, password, passwordConfirm } = req.body;

  if (!name || !email || !password || !passwordConfirm)
    return next(new AppError("Please provide all required fields", 400));

  const user = await User.findOne({ email: email.toLowerCase().trim() });

  if (user) return next(new AppError("User already exists", 400));

  const newUser = await User.create({
    name,
    nickname,
    email: email.toLowerCase().trim(),
    password,
    passwordConfirm,
  });

  if (!newUser) return next(new AppError("Error creating user", 500));

  createSendToken(newUser, 201, res);
});

const login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password)
    return next(new AppError("Please provide an email and password", 400));

  const user = await User.findOne({ email: email.toLowerCase().trim() }).select(
    "+password -isActive -__v  -updatedAt"
  );

  if (!user || !(await user.isCorrectPassword(password, user.password)))
    return next(new AppError("Incorrect email or password ", 401));

  createSendToken(user, 200, res);
});

const logout = catchAsync(async (req, res) => {
  res.cookie("jwt", "");
  res.status(200).json({
    status: "success",
    message: "Logged out successfully",
  });
});

const protect = catchAsync(async function (req, res, next) {
  const token = req.cookies.jwt;

  if (!token)
    return next(
      new AppError("You are not logged in, please log in to get access.", 401)
    );

  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  const freshUser = await User.findById(decoded.id).select(
    "-isActive -password -__v  -updatedAt"
  );

  if (!freshUser)
    return next(
      new AppError(
        "The user belonging to this token does no longer exist, pleasse log in again.",
        401
      )
    );

  if (freshUser.changedPasswordAfter(decoded.iat))
    return next(
      new AppError("User changed password recently, please log in again.", 401)
    );

  req.user = freshUser;
  next();
});

const checkAuth = catchAsync(async (req, res, next) => {
  if (!req.user) {
    return next(new AppError("User not logged in", 401));
  }

  res.status(200).json({
    status: "success",
    data: {
      user: req.user,
    },
  });
});

const forgotPassword = catchAsync(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user)
    return next(new AppError("There is no user with that email address.", 404));

  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  const resetUrl = `${process.env.CLIENT_URL}/resetPassword/${resetToken}`;
  // const resetUrl = `${req.protocol}://${process.env.CLIENT_URL}/resetPassword/${resetToken}`;

  try {
    await sendEmail({
      email: user.email,
      subject: "Your Bubbly password reset link (valid for 10 minutes)",
      resetUrl,
    });

    return res.status(200).json({
      status: "success",
      message: `Reset link sent to the provided email (${user.email}). Your password reset token (valid for 10 minutes). `,
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    console.log(err);

    return next(
      new AppError(
        "There was a problem sending the email, please try again later.",
        500
      )
    );
  }
});

const resetPassword = catchAsync(async (req, res, next) => {
  if (!req.body.password || !req.body.passwordConfirm)
    return next(
      new AppError("Please provide a password and passwordConfirm.", 400)
    );

  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) return next(new AppError("Token is invalid or has expired.", 400));

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  await user.save();

  createSendToken(user, 200, res);
});

export {
  signup,
  login,
  logout,
  protect,
  checkAuth,
  forgotPassword,
  resetPassword,
};
