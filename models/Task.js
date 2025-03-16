const mongoose = require("mongoose");

const TaskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  dueDate: Date,
  priority: { type: String, enum: ["High", "Medium", "Low"], default: "Medium" },
  status: { type: String, enum: ["To Do", "In Progress", "Completed"], default: "To Do" },
  relatedTo: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: "relatedModel", // Dynamic reference to Lead, Deal, or Contact
  },
  relatedModel: { type: String, enum: ["Lead", "Deal", "Contact"] }, // Model type
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Assigned user
}, { timestamps: true });

module.exports = mongoose.model("Task", TaskSchema);
