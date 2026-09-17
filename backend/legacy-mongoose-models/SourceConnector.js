const mongoose = require('mongoose');

const sourceConnectorSchema = new mongoose.Schema({
  sourceName: { type: String, required: true },
  sourceType: { type: String, enum: ['REST API', 'GraphQL API', 'Apify Actor', 'Google Form', 'Typeform', 'Google Sheet', 'CSV Upload', 'Webhook', 'Job Portal Export', 'Resume Database Export', 'Public Search Discovery', 'Internal LucoHire Form'], required: true },
  countriesSupported: [{ type: String }],
  apiBaseUrl: { type: String, default: '' },
  authType: { type: String, enum: ['No auth', 'API key', 'Bearer token', 'Basic auth', 'OAuth 2.0', 'Custom header', 'Apify token', 'Webhook secret', 'CSV upload'], default: 'No auth' },
  encryptedSecretReference: { type: String, default: '' },
  actorId: { type: String, default: '' },
  formId: { type: String, default: '' },
  webhookUrl: { type: String, default: '' },
  inputSchemaJson: { type: Object, default: {} },
  outputMappingJson: { type: Object, default: {} },
  activeSignalMappingJson: { type: Object, default: {} },
  dedupeRulesJson: { type: Object, default: {} },
  dailyQuota: { type: Number, default: 0 },
  monthlyQuota: { type: Number, default: 0 },
  dailyBudget: { type: Number, default: 0 },
  monthlyBudget: { type: Number, default: 0 },
  riskLevel: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Low' },
  status: { type: String, enum: ['Free / Ready', 'Free / API Key Required', 'Limited Free / Usage-Based', 'Paid / Subscription Required', 'Approval-Based API', 'CSV Import Available', 'Locked Until Credentials Added', 'Ready to Run', 'Quota Exhausted', 'Partner Approval Pending', 'Disabled'], default: 'Ready to Run' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } // Admin who created
}, { timestamps: true });

module.exports = mongoose.model('SourceConnector', sourceConnectorSchema);
