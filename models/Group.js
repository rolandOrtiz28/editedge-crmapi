const mongoose = require("mongoose");

const GroupSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  members: [
    {
      memberId: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: "members.type" },
      type: { type: String, enum: ["lead", "contact"], required: true }, // Dynamic reference
    },
  ],
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Group", GroupSchema);
