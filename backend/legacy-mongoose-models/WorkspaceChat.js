const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

const workspaceChatSchema = new mongoose.Schema({
  recruiterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  messages: [messageSchema]
}, { timestamps: true });

workspaceChatSchema.index({ recruiterId: 1, updatedAt: -1 });

module.exports = mongoose.model('WorkspaceChat', workspaceChatSchema);
