const mongoose = require('mongoose');

const sourceRunLogSchema = new mongoose.Schema({
  sourceId: { type: mongoose.Schema.Types.ObjectId, ref: 'SourceConnector' },
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  country: { type: String, default: '' },
  keyword: { type: String, default: '' },
  location: { type: String, default: '' },
  filtersJson: { type: Object, default: {} },
  expectedRecords: { type: Number, default: 0 },
  importedRecords: { type: Number, default: 0 },
  duplicateRecords: { type: Number, default: 0 },
  activeLeadsFound: { type: Number, default: 0 },
  costUsed: { type: Number, default: 0 },
  status: { type: String, enum: ['Success', 'Failed', 'Timeout', 'Quota Hit', 'Paused'], default: 'Success' },
  errorMessage: { type: String, default: '' },
  startedAt: { type: Date, default: Date.now },
  completedAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('SourceRunLog', sourceRunLogSchema);
