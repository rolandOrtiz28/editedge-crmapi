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
  assignee: { type: String, default: null },
  groups: [{ type: mongoose.Schema.Types.ObjectId, ref: "Group" }], // ✅ NEW FIELD
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Lead", LeadSchema);
