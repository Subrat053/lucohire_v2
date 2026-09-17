const mongoose = require("mongoose");

const skillGapReportSchema = new mongoose.Schema(
  {
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    reportDate: {
      type: String, // YYYY-MM-DD
      required: true,
    },
    candidateSkills: {
      type: [String],
      default: [],
    },
    matchedJobIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "JobPost",
      },
    ],
    missingSkills: {
      type: [String],
      default: [],
    },
    recommendedSkills: {
      type: [String],
      default: [],
    },
    reportSummary: {
      type: String,
      default: "",
    },
    detailedAnalysis: {
      type: String,
      default: "",
    },
    confidence: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    aiProvider: {
      type: String,
      default: "claude-sonnet",
    },
    rawAiResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  { timestamps: true }
);

// candidateId + reportDate must be unique
skillGapReportSchema.index(
  { candidateId: 1, reportDate: 1 },
  { unique: true }
);

module.exports = mongoose.model("SkillGapReport", skillGapReportSchema);
