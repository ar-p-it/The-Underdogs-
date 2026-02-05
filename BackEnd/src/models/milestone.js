const mongoose = require("mongoose");

const milestoneSchema = new mongoose.Schema(
  {
    pool: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Pool",
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: String,
    releasePercent: {
      type: Number,
      min: 0,
      max: 100,
    },
    releaseAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["PENDING", "COMPLETED"],
      default: "PENDING",
    },
    completedAt: Date,
    completedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    expense: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PoolExpense",
    },
  },
  { timestamps: true },
);

// export default mongoose.model("Milestone", milestoneSchema);
module.exports = mongoose.model("Milestone", milestoneSchema);
