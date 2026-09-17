const mongoose = require("mongoose");

const profileShareTokenSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    createdByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    createdByRole: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    isRevoked: {
      type: Boolean,
      default: false,
      index: true,
    },
    accessCount: {
      type: Number,
      default: 0,
    },
    lastAccessedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ProfileShareToken", profileShareTokenSchema);
