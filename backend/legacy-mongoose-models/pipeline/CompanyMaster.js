const mongoose = require("mongoose");

const companyMasterSchema = new mongoose.Schema(
  {
    canonicalName: { type: String, required: true, unique: true },
    companyDomain: { type: String, default: null },
    aliases: [{ type: String }],
    confidenceScore: { type: Number, default: 100 },
    status: {
      type: String,
      enum: ["active", "pending_review", "rejected"],
      default: "active",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("PipelineCompanyMaster", companyMasterSchema);
