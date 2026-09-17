const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChatConversation',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['provider', 'recruiter', 'admin', 'system'],
      default: 'recruiter',
      index: true,
    },
    author: {
      type: String,
      enum: ['user', 'assistant', 'system'],
      required: true,
      index: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 12000,
    },
    status: {
      type: String,
      enum: ['pending', 'sent', 'failed', 'regenerated'],
      default: 'sent',
      index: true,
    },
    clientMessageId: {
      type: String,
      default: '',
      trim: true,
      index: true,
    },
    parentMessageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChatMessage',
      default: null,
      index: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

chatMessageSchema.index({ conversationId: 1, createdAt: 1, _id: 1 });
chatMessageSchema.index(
  { conversationId: 1, clientMessageId: 1 },
  {
    unique: true,
    partialFilterExpression: { clientMessageId: { $exists: true, $type: 'string', $ne: '' } },
  }
);

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
