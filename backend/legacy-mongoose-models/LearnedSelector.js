const mongoose = require('mongoose');

const LearnedSelectorSchema = new mongoose.Schema({
  domain: {
    type: String,
    required: true,
    index: true
  },
  field: {
    type: String,
    required: true
  },
  selector: {
    type: String,
    required: true
  },
  confidence: {
    type: Number,
    default: 100
  }
}, { timestamps: true });

// A domain can have one specific selector per field
LearnedSelectorSchema.index({ domain: 1, field: 1 }, { unique: true });

module.exports = mongoose.model('LearnedSelector', LearnedSelectorSchema);
