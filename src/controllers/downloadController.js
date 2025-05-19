import fs from "fs-extra"; // fs with promise support
import archiver from "archiver";
import path from "path";
import axios from "axios";

import Message from "../models/messageModel.js";
import User from "../models/userModel.js";

import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";

const getChatMessages = async (userId, contactId) => {
  return Message.find({
    $or: [
      { senderId: userId, receiverId: contactId },
      { senderId: contactId, receiverId: userId },
    ],
  })
    .sort({ createdAt: 1 })
    .populate("senderId", "name")
    .populate("receiverId", "name");
};

const downloadAndSaveMedia = async (url, mediaDir, type) => {
  const filename = path.basename(new URL(url).pathname);
  const filePath = path.join(mediaDir, filename);

  try {
    const res = await axios.get(url, { responseType: "stream" });
    const writer = fs.createWriteStream(filePath);

    await new Promise((response, reject) => {
      res.data.pipe(writer);
      writer.on("finish", response);
      writer.on("error", reject);
    });

    if (type === "image")
      return `<img class="media" src="media/${filename}" />`;

    if (type === "video")
      return `<video class="media" controls><source src="media/${filename}" type="video/mp4" /></video>`;

    if (type === "voice")
      return `<audio class="media" controls><source src="media/${filename}" type="audio/mpeg" /></audio>`;

    return `<a class="media" href="media/${filename}" download>${filename}</a>`;
  } catch (err) {
    console.warn(`Failed to download ${type} from ${url}`);
    return "";
  }
};

const renderMessageHTML = async (msg, userId, mediaDir) => {
  const time = new Date(msg.createdAt).toLocaleString();
  const isSender = msg.senderId._id.toString() === userId.toString();
  let html = `
    <div class="${isSender ? "chat-end" : "chat-start"}">
      <div class="bubble ${isSender ? "sender" : "receiver"}">
        ${msg.text ? `<p>${msg.text}</p>` : ""}
  `;

  const mediaTypes = ["image", "video", "voice", "file"];
  for (const type of mediaTypes) {
    const url = msg[type];
    if (url) {
      html += await downloadAndSaveMedia(url, mediaDir, type);
    }
  }

  html += `<time>${time}</time></div></div>`;
  return html;
};

const buildChatHTML = async (messages, contact, userId, mediaDir) => {
  let html = `
    <html>
    <head>
      <meta charset="utf-8"/>
      <title>Chat with ${contact.name}</title>
      <style>
        body { font-family: sans-serif; background-color: #f9f9f9; padding: 20px; }
        .chat-container { display: flex; flex-direction: column; gap: 16px; }
        .chat-start, .chat-end { display: flex; }
        .chat-start { justify-content: flex-start; }
        .chat-end { justify-content: flex-end; }
        .bubble {
          max-width: 60%;
          padding: 10px 16px;
          border-radius: 16px;
          display: flex;
          flex-direction: column;
          background-color: #f1f5f9;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .bubble.sender { background-color: #cbd5e1; }
        .bubble.receiver { background-color: #f1f5f9; }
        .media { margin-top: 8px; max-width: 100%; border-radius: 8px; }
        time { font-size: 0.75rem; opacity: 0.6; margin-top: 4px; text-align: right; }
      </style>
    </head>
    <body>
      <h1>Chat with ${contact.name}</h1>
      <div class="chat-container">
  `;

  for (const msg of messages) {
    html += await renderMessageHTML(msg, userId, mediaDir);
  }

  html += "</div></body></html>";

  return html;
};

const zipAndSendDirectory = async (res, baseDir, zipPath, filename) => {
  const output = fs.createWriteStream(zipPath);
  const archive = archiver("zip", { zlib: { level: 9 } }); // use compression

  archive.pipe(output);
  archive.directory(baseDir, false);
  await archive.finalize();

  output.on("close", async () => {
    res.download(zipPath, filename, async () => {
      await fs.remove(baseDir);
      await fs.remove(zipPath);
    });
  });
};

export const downloadChatData = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const timestamp = Date.now();
  const baseDir = path.join("temp", `chat-export-${userId}-${timestamp}`);
  await fs.ensureDir(baseDir);

  const user = await User.findById(userId).populate(
    "contacts",
    "name nickname"
  );

  if (!user || user.contacts.length === 0) {
    return next(new AppError("No contacts or chats found.", 404));
  }

  for (const contact of user.contacts) {
    const contactDir = path.join(baseDir, contact.nickname);
    const mediaDir = path.join(contactDir, "media");
    await fs.ensureDir(mediaDir);

    const messages = await getChatMessages(userId, contact._id);
    const html = await buildChatHTML(messages, contact, userId, mediaDir);

    await fs.writeFile(path.join(contactDir, "chat.html"), html);
  }

  const zipPath = path.join("temp", `chat-export-${userId}-${timestamp}.zip`);
  await zipAndSendDirectory(res, baseDir, zipPath, `chat-export-${userId}.zip`);
});
