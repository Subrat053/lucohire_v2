const mongoose = require("mongoose");

const aiAnalysisResultSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
      index: true,
    },
    feature_name: {
      type: String,
      required: true,
      index: true,
    },
    input_hash: {
      type: String,
      required: true,
      index: true,
    },
    model_name: {
      type: String,
      required: true,
    },
    prompt_version: {
      type: Number,
      default: 1,
    },
    input_snapshot: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    raw_response: {
      type: String,
      default: "",
    },
    parsed_json: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    confidence_score: {
      type: Number,
      default: 0,
    },
    needs_review: {
      type: Boolean,
      default: false,
    },
    token_usage: {
      input_tokens: { type: Number, default: 0 },
      output_tokens: { type: Number, default: 0 },
      total_tokens: { type: Number, default: 0 },
    },
    estimated_cost: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["success", "failed", "repaired", "cached"],
      default: "success",
      index: true,
    },
    error_message: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

// Compound index for quick lookups
aiAnalysisResultSchema.index({ input_hash: 1, status: 1 });

module.exports = mongoose.model(
  "AiAnalysisResult",
  aiAnalysisResultSchema,
  "ai_analysis_results"
);
