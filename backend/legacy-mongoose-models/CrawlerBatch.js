const mongoose = require("mongoose");

const CrawlerBatchSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "running", "paused", "completed", "stopped", "failed"],
      default: "pending",
    },
    companies: [
      {
        company: { type: String },
        status: {
          type: String,
          enum: ["pending", "crawling", "success", "failed", "error", "paused"],
          default: "pending",
        },
        jobsFound: { type: Number, default: 0 },
        careerUrl: { type: String },
        error: { type: String },
      },
    ],
    totalCount: { type: Number, default: 0 },
    processedCount: { type: Number, default: 0 },
    error: { type: String },
  },
  { timestamps: true },
);

module.exports = mongoose.model("CrawlerBatch", CrawlerBatchSchema);
