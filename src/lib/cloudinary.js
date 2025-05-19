import { v2 as cloudinary } from "cloudinary";

import { config } from "dotenv";

config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_API_CLOUDNAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadMedia = async (file) => {
  try {
    const matches = file.match(/^data:(.+);base64,/);
    if (!matches) throw new Error("Invalid base64 format");

    const mimeType = matches[1];

    let resourceType = "auto";
    if (mimeType.startsWith("image/")) resourceType = "image";
    else if (mimeType.startsWith("audio/") || mimeType.startsWith("video/"))
      resourceType = "video";
    else resourceType = "raw";

    const res = await cloudinary.uploader.upload(file, {
      resource_type: resourceType,
      folder: "chat-media",
    });

    return res.secure_url;
  } catch (err) {
    console.error("Error uploading media to Cloudinary:", err.message);
    throw new Error("Failed to upload media, please try again.");
  }
};

export { uploadMedia };
export default cloudinary;
