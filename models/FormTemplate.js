const mongoose = require('mongoose');

const formTemplateSchema = new mongoose.Schema({
  name: { type: String, required: true },
  fields: [{
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
    options: [String], // For select, radio, multiselect
    placeholder: { type: String }, // Optional UI hint
    helpText: { type: String },    // Help tooltip or description
    defaultValue: { type: mongoose.Schema.Types.Mixed }, // Fallback value
    validation: { // Validation rules
      type: Object,
      default: {},
      of: {
        minLength: { type: Number }, // For text, textarea
        maxLength: { type: Number }, // For text, textarea
        min: { type: Number },       // For number, date
        max: { type: Number },       // For number, date
        pattern: { type: String },   // Regex pattern for text, email, url, tel
        requiredMessage: { type: String }, // Custom message for required field
      }
    }
  }],
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('FormTemplate', formTemplateSchema);