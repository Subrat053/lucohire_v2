const mongoose = require('mongoose');

const aiChatCacheSchema = new mongoose.Schema({
  message: { type: String, required: true, trim: true, index: true, unique: true },
  reply: { type: String, required: true, trim: true },
  detectedIntent: { type: String, default: '' },
  extracted: { type: mongoose.Schema.Types.Mixed, default: {} },
  suggestions: [{ type: String }],
  model: { type: String, default: 'openai' },
}, { timestamps: true });

module.exports = mongoose.model('AIChatCache', aiChatCacheSchema);
