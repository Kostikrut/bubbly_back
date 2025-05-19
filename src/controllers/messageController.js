import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import User from "../models/userModel.js";
import Message from "../models/messageModel.js";
import { uploadMedia } from "../lib/cloudinary.js";
import { getRecieverSocketId, io } from "../lib/socket.js";

const isBlocked = async (userId, contactId) => {
  const [user, contact] = await Promise.all([
    User.findById(userId).select("blockedUsers"),
    User.findById(contactId).select("blockedUsers"),
  ]);

  if (!contact) return new AppError("User not found", 404);

  if (contact.blockedUsers.includes(userId)) {
    return new AppError("You have been blocked by this user", 403);
  }

  if (user && user.blockedUsers.includes(contactId)) {
    return new AppError("You have blocked this user", 403);
  }

  return null;
};

const getMessages = catchAsync(async (req, res, next) => {
  const { id: contactId } = req.params;
  if (!contactId) return next(new AppError("Please provide a user id", 400));

  const blockedError = await isBlocked(req.user._id, contactId);
  if (blockedError) return next(blockedError);

  const messages = await Message.find({
    $or: [
      { senderId: req.user._id, receiverId: contactId },
      { senderId: contactId, receiverId: req.user._id },
    ],
  });

  if (!messages) {
    return next(new AppError("No messages found", 404));
  }
  res.status(200).json({
    status: "success",
    data: {
      messages,
    },
  });
});

const sendMessage = catchAsync(async (req, res, next) => {
  let { text, image, voice, video, file } = req.body;
  const { id: receiverId } = req.params;

  if (!text && !image && !voice && !video && !file) {
    return next(new AppError("Please provide a message", 400));
  }

  const blockedError = await isBlocked(req.user._id, receiverId);
  if (blockedError) return next(blockedError);

  if (image && !image.startsWith("data:image/")) {
    return next(new AppError("Invalid image format", 400));
  }
  if (file && !file.startsWith("data:application/")) {
    return next(new AppError("Invalid file format", 400));
  }
  if (video && !video.startsWith("data:video/")) {
    return next(new AppError("Invalid video format", 400));
  }
  if (voice && !voice.startsWith("data:audio/")) {
    return next(new AppError("Invalid voice format", 400));
  }

  const [imageUrl, fileUrl, videoUrl, voiceUrl] = await Promise.all([
    image ? uploadMedia(image) : null,
    file ? uploadMedia(file) : null,
    video ? uploadMedia(video) : null,
    voice ? uploadMedia(voice) : null,
  ]);

  const newMessage = await Message.create({
    senderId: req.user._id,
    receiverId,
    text,
    image: imageUrl,
    voice: voiceUrl,
    video: videoUrl,
    file: fileUrl,
  });

  const receiverSocketId = getRecieverSocketId(receiverId);
  if (receiverSocketId) {
    io.to(receiverSocketId).emit("newMessage", newMessage);
  }

  res.status(201).json({
    status: "success",
    data: {
      message: newMessage,
    },
  });
});

const deleteManyMessages = catchAsync(async (req, res, next) => {
  const { onlyForMe, forUserId: userId } = req.body;
  let deleted;

  if (userId) {
    if (onlyForMe) {
      deleted = Message.deleteMany({
        senderId: req.user._id,
        receiverId: userId,
      });
    }
    if (!onlyForMe) {
      deleted = Message.deleteMany({
        $or: [
          { senderId: req.user._id, receiverId: userId },
          { senderId: userId, receiverId: req.user._id },
        ],
      });
    }
  }

  if (!userId) {
    if (onlyForMe) {
      deleted = Message.deleteMany({
        senderId: req.user._id,
      });
    }
    if (!onlyForMe) {
      deleted = Message.deleteMany({
        $or: [{ senderId: req.user._id }, { receiverId: req.user._id }],
      });
    }
  }

  const { deletedCount } = await deleted;

  if (deletedCount === 0) {
    return next(new AppError("No messages found", 404));
  }

  res.status(204).json({
    status: "success",
    data: null,
  });
});

export { getMessages, sendMessage, deleteManyMessages };
