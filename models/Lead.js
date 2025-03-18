// models/Lead.js
const mongoose = require("mongoose");

const LeadSchema = new mongoose.Schema({
  name: String,
  company: String,
  email: String,
  phone: String,
  address: String,
  website: String,
  description: String,
  channel: String,
  companySize: String,
  niche: String,
  status: { type: String, default: "New" },
  value: Number,
  notes: [{ type: String }],
  reminders: [
    {
      text: String,
      date: Date,
    },
  ],
  assignee: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }, // Updated to ObjectId
  groups: [{ type: mongoose.Schema.Types.ObjectId, ref: "Group" }],
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Lead", LeadSchema);