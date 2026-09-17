const mongoose = require("mongoose");

const resumeAccessLogSchema = new mongoose.Schema(
  {
    recruiterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    resumeObjectKey: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    ipAddress: {
      type: String,
      default: "",
    },
    userAgent: {
      type: String,
      default: "",
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

module.exports = mongoose.model("ResumeAccessLog", resumeAccessLogSchema);
