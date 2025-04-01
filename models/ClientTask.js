const mongoose = require('mongoose');

const clientTaskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'completed'],
    default: 'pending',
  },
  priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
  dueDate: { type: Date },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  assignedTo: { type: String },
  createdAt: { type: Date, default: Date.now },
});

// Add indexes for frequently queried fields
clientTaskSchema.index({ clientId: 1, status: 1 });

module.exports = mongoose.model('ClientTask', clientTaskSchema);