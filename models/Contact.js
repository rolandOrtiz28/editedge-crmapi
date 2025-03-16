const mongoose = require("mongoose");

const ContactSchema = new mongoose.Schema({
  name: { type: String, required: true },
  company: String,
  email: String,
  phone: String,
  status: { 
    type: String, 
    enum: ["New", "Contacted", "Qualified", "Proposal", "Negotiation", "Won"], 
    default: "New" 
  },
  avatar: String, 
  groups: [{ type: mongoose.Schema.Types.ObjectId, ref: "Group" }], // ✅ Reference to Group Model
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Contact", ContactSchema);
