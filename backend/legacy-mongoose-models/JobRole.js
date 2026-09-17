const mongoose = require('mongoose');

const jobRoleSchema = new mongoose.Schema({
  roleName: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

module.exports = mongoose.model('JobRole', jobRoleSchema);
