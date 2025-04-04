const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const clientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['client'], default: 'client' },
  leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
  industry: { type: String },
  contact: { type: String },
  phone: { type: String },
  status: { type: String, default: 'Active' },
  assignedTo: { type: String },
  address: { type: String },
  website: { type: String },
  notes: { type: String },
  onboardingStatus: { type: String, default: 'pending' },
  files: [{ name: String, uploadDate: Date, size: String, url: String }],
  interactions: [
    {
      type: { type: String, required: true },
      date: { type: Date, default: Date.now },
      description: { type: String, required: true },
    },
  ],
  onboardingSteps: [
    {
      label: { type: String, required: true },
      completed: { type: Boolean, default: false },
      date: { type: String, default: 'Pending' },
    },
  ],
  assignedFormTemplate: {
    templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'FormTemplate' },
    customFields: [{
      label: { type: String, required: true },
      type: { 
        type: String, 
        enum: [
          'text', 'textarea', 'number', 'date', 'checkbox', 'radio', 'select',
          'multiselect', 'file', 'email', 'url', 'tel', 'password', 'color',
          'time', 'datetime', 'heading', 'paragraph'
        ],
        required: true 
      },
      required: { type: Boolean, default: false },
      options: [String],
      placeholder: { type: String },
      helpText: { type: String },
      defaultValue: { type: mongoose.Schema.Types.Mixed },
      validation: {
        type: Object,
        default: {},
        of: {
          minLength: { type: Number },
          maxLength: { type: Number },
          min: { type: Number },
          max: { type: Number },
          pattern: { type: String },
          requiredMessage: { type: String },
        }
      }
    }],
  },
  consultationFormResponses: {
    type: Map,
    of: String,
    default: new Map(),
  },
  createdAt: { type: Date, default: Date.now },
});

// Hash password before saving
clientSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

// Add method to compare passwords
clientSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Add indexes for frequently queried fields
clientSchema.index({ status: 1 });

module.exports = mongoose.model('Client', clientSchema);