// models/Meeting.js
const mongoose = require("mongoose");

const meetingSchema = new mongoose.Schema({
  contact: { type: String, required: true },
  company: { type: String, required: true },
  date: { type: String, required: true }, // Storing as string from frontend (e.g., "2025-03-20")
  time: { type: String, required: true }, // Storing as string (e.g., "14:30")
  duration: { type: String, required: true }, // e.g., "15 min"
  type: {
    type: String,
    enum: ["Scheduled", "In-person", "Virtual"],
    default: "Scheduled",
  },
  status: {
    type: String,
    enum: ["Pending", "Completed", "Cancelled"],
    default: "Pending",
  },
  notes: { type: String },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, 
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Meeting", meetingSchema);