const mongoose = require('mongoose');

const reviewRemarkSchema = new mongoose.Schema(
  {
    text: { type: String, default: '' },
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    adminName: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const approvalSectionSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    label: { type: String, default: '' },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'not_submitted'],
      default: 'not_submitted',
    },
    url: { type: String, default: '' },
    value: { type: String, default: '' },
    items: { type: [mongoose.Schema.Types.Mixed], default: [] },
    remarks: { type: [reviewRemarkSchema], default: [] },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
  },
  { _id: false },
);

const activityLogSchema = new mongoose.Schema(
  {
    action: { type: String, default: '' },
    section: { type: String, default: '' },
    sectionLabel: { type: String, default: '' },
    remark: { type: String, default: '' },
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    adminName: { type: String, default: '' },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false },
);

module.exports = {
  approvalSectionSchema,
  activityLogSchema,
};