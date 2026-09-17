const mongoose = require("mongoose");

const candidateDigestLogSchema = new mongoose.Schema(
  {
    candidate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    date: {
      type: String, // format YYYY-MM-DD
      required: true,
      index: true,
    },
    jobsMatched: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "JobPost",
      },
    ],
    channels: [
      {
        type: String,
        enum: ["email", "whatsapp"],
      },
    ],
    emailStatus: {
      type: String,
      enum: ["none", "sent", "failed"],
      default: "none",
    },
    whatsappStatus: {
      type: String,
      enum: ["none", "sent", "failed"],
      default: "none",
    },
    error: {
      type: String,
      default: "",
    },
    sentAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Prevent duplicate digests for a candidate on the same day
candidateDigestLogSchema.index({ candidate: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("CandidateDigestLog", candidateDigestLogSchema);
