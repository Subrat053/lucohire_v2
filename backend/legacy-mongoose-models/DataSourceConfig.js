const mongoose = require('mongoose');

const dataSourceConfigSchema = new mongoose.Schema({
  name: { type: String, required: true },
  country: { type: String, required: true },
  type: { type: String, enum: ['apify_actor', 'rest_api', 'csv_upload', 'free_api'], required: true },
  sourceKey: { type: String, default: '' }, // e.g. 'remoteok', 'arbeitnow', 'remotive' for free_api type
  endpointOrActorId: { type: String, default: '' },
  apiMethod: { type: String, enum: ['GET', 'POST'], default: 'GET' },
  apiHeaders: { type: String, default: '' },
  apiKey: { type: String, default: '' },
  actorInputSchema: { type: String, default: '' },
  aiPromptTemplate: { type: String, required: true },
  status: { type: String, default: 'Ready / Free' },
  isActive: { type: Boolean, default: true },
  failureCount: { type: Number, default: 0 },
  lastSuccess: { type: Date },
  costPerRecord: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('DataSourceConfig', dataSourceConfigSchema);
