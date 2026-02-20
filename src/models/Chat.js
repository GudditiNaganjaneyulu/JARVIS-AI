const mongoose = require("mongoose");

const ChatSchema = new mongoose.Schema({
  prompt: String,
  response: String,
  createdAt: { type: Date, default: Date.now }
});

ChatSchema.index({ prompt: "text" }); // IMPORTANT

module.exports = mongoose.model("Chat", ChatSchema);