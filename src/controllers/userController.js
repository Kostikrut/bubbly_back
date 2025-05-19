import User from "../models/userModel.js";
import cloudinary from "../lib/cloudinary.js";
import AppError from "../utils/appError.js";
import catchAsync from "../utils/catchAsync.js";

const updateUser = catchAsync(async (req, res, next) => {
  const { name, nickname, email } = req.body;

  if (!name && !email && !nickname)
    return next(
      new AppError("Please provide at least one field to update", 400)
    );

  const updatedUser = await User.findByIdAndUpdate(
    req.user.id,
    { name, email, nickname },
    { new: true, runValidators: true }
  ).select("-isActive -password -__v  -updatedAt  ");

  if (!updatedUser)
    return next(
      new AppError("Error updating user, please try again later.", 500)
    );

  res.status(200).json({
    status: "success",
    data: {
      user: updatedUser,
    },
  });
});

const updateOnlineStatus = catchAsync(async (req, res, next) => {
  const { showOnlineStatus } = req.body;

  if (showOnlineStatus === undefined)
    return next(new AppError("Please provide a status", 400));

  const updatedUser = await User.findByIdAndUpdate(
    req.user.id,
    { showOnlineStatus },
    { new: true, runValidators: true }
  ).select("-isActive -password -__v -updatedAt");

  if (!updatedUser)
    return next(
      new AppError("Error updating user, please try again later.", 500)
    );

  res.status(200).json({
    status: "success",
    data: {
      user: updatedUser,
    },
  });
});

const updateProfilePic = catchAsync(async (req, res, next) => {
  const { profilePic } = req.body;
  const userId = req.user._id;

  if (!profilePic) {
    return next(new AppError("Please provide a profile picture", 400));
  }

  let uploadUrl;
  try {
    const res = await cloudinary.uploader.upload(profilePic);

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { profilePic: res.secure_url },
      { new: true }
    );

    uploadUrl = res.secure_url;
  } catch (err) {
    console.log(err);
    return next(
      new AppError("Error uploading image, please try again later.", 500)
    );
  }

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { profilePic: uploadUrl },
    { new: true }
  ).select("-isActive -password -__v -updatedAt");

  if (!updatedUser) {
    return next(
      new AppError("Error updating user, please try again later.", 500)
    );
  }

  res.status(200).json({
    status: "success",
    data: {
      user: updatedUser,
    },
  });
});

const setChatWallpaper = catchAsync(async (req, res, next) => {
  const { wallpaper } = req.body;

  if (!wallpaper) {
    return next(new AppError("Please provide a wallpaper", 400));
  }

  const upload = await cloudinary.uploader.upload(wallpaper);
  const uploadUrl = upload?.secure_url;

  if (!uploadUrl) return next(new AppError("Error uploading image", 500));

  res.status(200).json({
    status: "success",
    data: {
      wallpaper: uploadUrl,
    },
  });
});

const getAllUsers = catchAsync(async (req, res, next) => {
  const users = await User.find({ _id: { $ne: req.user._id } }).select(
    "-isActive -password -__v -createdAt -updatedAt"
  );

  if (!users) {
    return next(new AppError("No users found", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      users,
    },
  });
});

const searchUsers = catchAsync(async (req, res, next) => {
  const search = req.query.search?.trim();
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  if (!search) {
    return next(new AppError("Please provide a search term", 400));
  }

  const searchQuery = {
    $or: [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { nickname: { $regex: search, $options: "i" } },
    ],
  };

  const [totalUsers, users] = await Promise.all([
    User.countDocuments(searchQuery),
    User.find(searchQuery)
      .select("-isActive -password -__v -createdAt -updatedAt -contacts")
      .skip(skip)
      .limit(limit),
  ]);

  res.status(200).json({
    status: "success",
    data: {
      users,
      totalUsers,
    },
  });
});

const getContacts = catchAsync(async (req, res, next) => {
  const { contacts } = req.user;

  let users = await User.find({ _id: { $in: contacts } }).select(
    "-isActive -password -__v -createdAt -updatedAt"
  );

  if (!users) users = [];

  res.status(200).json({
    status: "success",
    data: {
      users,
    },
  });
});

const addToContacts = catchAsync(async (req, res, next) => {
  const { id: userId } = req.params;

  if (!userId) {
    return next(new AppError("Please provide a user ID", 400));
  }

  const user = await User.findById(userId);

  if (!user) {
    return next(new AppError("User not found", 404));
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    { $addToSet: { contacts: userId } },
    { new: true }
  ).select("-isActive -password -__v -createdAt -updatedAt");

  if (!updatedUser) {
    return next(
      new AppError("Error updating user, please try again later.", 500)
    );
  }

  res.status(200).json({
    status: "success",
    data: {
      user: updatedUser,
    },
  });
});

const removeFromContacts = catchAsync(async (req, res, next) => {
  const { id: userId } = req.params;

  if (!userId) {
    return next(new AppError("Please provide a user ID", 400));
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    { $pull: { contacts: userId } },
    { new: true }
  ).select("-isActive -password -__v -createdAt -updatedAt");

  if (!updatedUser) {
    return next(
      new AppError("Error updating user, please try again later.", 500)
    );
  }

  res.status(200).json({
    status: "success",
    data: {
      user: updatedUser,
    },
  });
});

const getBlockedUsers = catchAsync(async (req, res) => {
  const userId = req.user._id;

  const user = await User.findById(userId).populate({
    path: "blockedUsers",
    select: "name nickname",
  });

  res.status(200).json({
    status: "success",
    data: {
      users: user.blockedUsers,
    },
  });
});

const blockUser = catchAsync(async (req, res, next) => {
  const { id: userId } = req.params;

  if (!userId) {
    return next(new AppError("Please provide a user id", 400));
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    { $addToSet: { blockedUsers: userId } },
    { new: true }
  ).select("-isActive -password -__v -createdAt -updatedAt ");

  if (!updatedUser) {
    return next(
      new AppError("Error updating user, please try again later.", 500)
    );
  }

  res.status(200).json({
    status: "success",
    data: {
      user: updatedUser,
    },
  });
});

const unblockUser = catchAsync(async (req, res, next) => {
  const { id: userId } = req.params;

  if (!userId) {
    return next(new AppError("Please provide a user id", 400));
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    { $pull: { blockedUsers: userId } },
    { new: true }
  ).select("-isActive -password -__v -createdAt -updatedAt ");

  if (!updatedUser) {
    return next(
      new AppError("Error updating user, please try again later.", 500)
    );
  }

  res.status(200).json({
    status: "success",
    data: {
      user: updatedUser,
    },
  });
});

export {
  updateUser,
  updateProfilePic,
  getAllUsers,
  setChatWallpaper,
  getContacts,
  searchUsers,
  addToContacts,
  removeFromContacts,
  blockUser,
  unblockUser,
  getBlockedUsers,
  updateOnlineStatus,
};
