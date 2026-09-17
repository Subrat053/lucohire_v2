const mongoose = require('mongoose');

const importBatchSchema = new mongoose.Schema({
  fileName: { type: String, required: true },
  originalSize: { type: Number, default: 0 },
  status: { 
    type: String, 
    enum: ['pending', 'processing', 'paused', 'stopped', 'completed', 'failed'],
    default: 'pending'
  },
  totalRows: { type: Number, default: 0 },
  processedRows: { type: Number, default: 0 },
  successCount: { type: Number, default: 0 },
  failedCount: { type: Number, default: 0 },
  errors: [{
    row: Number,
    message: String,
    data: mongoose.Schema.Types.Mixed
  }],
  csvData: { type: String, select: false }, // Stores the raw string, omitted by default
  startedAt: { type: Date },
  completedAt: { type: Date },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('ImportBatch', importBatchSchema);
