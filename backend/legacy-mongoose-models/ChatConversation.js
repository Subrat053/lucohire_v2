const mongoose = require('mongoose');

const chatConversationSchema = new mongoose.Schema(
  {
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
    title: {
      type: String,
      default: 'New Conversation',
      trim: true,
      maxlength: 180,
    },
    status: {
      type: String,
      enum: ['active', 'archived'],
      default: 'active',
      index: true,
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

chatConversationSchema.index({ userId: 1, role: 1, lastMessageAt: -1 });

module.exports = mongoose.model('ChatConversation', chatConversationSchema);
