const mongoose = require("mongoose");

const SentEmailSchema = new mongoose.Schema({
  recipient: { type: String, required: true },
  subject: { type: String, required: true },
  status: { type: String, enum: ["Sent", "Failed"], default: "Sent" },
  timestamp: { type: Date, default: Date.now },
});

// Auto-delete emails older than 30 days
SentEmailSchema.index({ timestamp: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

module.exports = mongoose.model("SentEmail", SentEmailSchema);
