import fs from "fs";
import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../src/models/userModel.js";
import Message from "../src/models/messageModel.js";
import { users } from "./mockUsersArray.js";

dotenv.config({ path: "../.env" });

const DB = process.env.MONGODB_URI;

const messages = JSON.parse(fs.readFileSync(`./john_doe_chats.json`, "utf-8"));

await mongoose.connect(DB).then(() => console.log("DB connection successful!"));

const importData = async (Model, data) => {
  console.log("importing data...");
  try {
    await Model.create(data, { validateBeforeSave: false });
    console.log("Data successfully loaded!");
  } catch (err) {
    console.log(err);
  }
  process.exit();
};

const deleteData = async (Model) => {
  try {
    await Model.deleteMany();
    console.log("Data successfully deleted!");
  } catch (err) {
    console.log(err);
  }
  process.exit();
};

if (process.argv[2] === "--import") {
  if (process.argv[3] === "--messages") {
    importData(Message, messages);
  } else {
    importData(User, users);
  }
}

if (process.argv[2] === "--delete") {
  if (process.argv[3] === "--messages") {
    deleteData(Message);
  } else {
    deleteData(User);
  }
}
