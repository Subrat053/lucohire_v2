const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    recruiterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    candidateName: {
      type: String,
      default: "",
    },
    candidateRole: {
      type: String,
      default: "",
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JobPost",
    },
    priority: {
      type: String,
      enum: ["High", "Medium", "Low"],
      default: "Medium",
    },
    dueDate: {
      type: String, // Storing as string for simplicity like 'Today', 'Tomorrow', 'Nov 12', etc.
      default: "No date",
    },
    status: {
      type: String,
      enum: ["todo", "in-progress", "done"],
      default: "todo",
    },
    order: {
      type: Number,
      default: 0,
    },
    aiSuggested: {
      type: Boolean,
      default: false,
    },
    comments: {
      type: Number,
      default: 0,
    },
    attachments: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Task", taskSchema);
