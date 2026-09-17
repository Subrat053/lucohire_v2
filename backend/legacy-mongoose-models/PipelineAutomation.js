const mongoose = require('mongoose');

const pipelineAutomationSchema = new mongoose.Schema({
  configId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DataSourceConfig',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  frequency: {
    type: String,
    enum: ['hourly', 'daily', 'weekly'],
    default: 'daily'
  },
  searchQuery: {
    type: String,
    required: true
  },
  location: {
    type: String,
    default: ''
  },
  jobType: {
    type: String,
    default: ''
  },
  experienceMin: { type: Number, default: 0 },
  experienceMax: { type: Number, default: 50 },
  activeFilters: {
    type: Object,
    default: {}
  },
  maxRecordsPerRun: {
    type: Number,
    default: 100
  },
  maxSpendPerRun: {
    type: Number,
    default: 10
  },
  outreachChannels: {
    type: [String],
    default: ['email'] // 'email', 'whatsapp', 'sms'
  },
  autoSendClaimLink: {
    type: Boolean,
    default: true
  },
  status: {
    type: String,
    enum: ['active', 'paused', 'error'],
    default: 'active'
  },
  lastRunAt: {
    type: Date,
    default: null
  },
  nextRunAt: {
    type: Date,
    default: null
  },
  failureCount: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

module.exports = mongoose.model('PipelineAutomation', pipelineAutomationSchema);
