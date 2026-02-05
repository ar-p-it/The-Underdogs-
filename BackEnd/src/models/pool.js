const mongoose = require("mongoose");

const poolSchema = new mongoose.Schema(
  {
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: true,
    },
    totalAmount: {
      type: Number,
      default: 0,
    },
    releasedAmount: {
      type: Number,
      default: 0,
    },
    currency: {
      type: String,
      default: "USDC",
    },
    status: {
      type: String,
      enum: ["ACTIVE", "COMPLETED", "CANCELLED"],
      default: "ACTIVE",
    },
    contributions: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        userName: String,
        amount: Number,
        paymentIntentId: String,
        transactionHash: String,
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    milestones: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Milestone",
      },
    ],
    finternetIntentId: String,
    paymentUrl: String,
    settlementDestination: String,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Pool", poolSchema);
