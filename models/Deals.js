const mongoose = require("mongoose");

const DealSchema = new mongoose.Schema({
  name: { type: String, required: true },
  company: { type: String, required: true },
  stage: { 
    type: String, 
    required: true, 
    enum: ["Lead In", "Qualification", "Proposal", "Negotiation", "Closed Won"] // ✅ Ensure valid values
  },
  value: { type: Number, required: true },
  probability: { type: Number, required: true, default: 50 }, // ✅ Ensure default value
  expectedCloseDate: { type: Date, required: true, default: Date.now }, // ✅ Default to current date
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Deal", DealSchema);
