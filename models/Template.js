const mongoose = require("mongoose");

const TemplateSchema = new mongoose.Schema(
  {
    subject: { type: String, required: true },
    html: { type: String, required: true },
    attachments: { type: [String], default: [] }, // Store attachment filenames
  },
  { timestamps: true }
);

module.exports = mongoose.model("Template", TemplateSchema);
