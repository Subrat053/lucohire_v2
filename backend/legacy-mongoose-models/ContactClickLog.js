const mongoose = require("mongoose");

const contactClickLogSchema = new mongoose.Schema(
  {
    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProviderProfile",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    actionType: {
      type: String,
      enum: ["whatsapp", "call"],
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index to quickly find logs by provider or user
contactClickLogSchema.index({ provider: 1, createdAt: -1 });
contactClickLogSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("ContactClickLog", contactClickLogSchema);
