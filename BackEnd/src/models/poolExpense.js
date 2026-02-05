const mongoose = require("mongoose");

const allocationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false },
);

const poolExpenseSchema = new mongoose.Schema(
  {
    pool: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Pool",
      required: true,
      index: true,
    },
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: true,
      index: true,
    },
    milestone: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Milestone",
      index: true,
    },
    title: {
      type: String,
      default: "Milestone deduction",
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: "USDC",
      trim: true,
    },
    splitMethod: {
      type: String,
      enum: ["equal", "exact", "percent", "shares"],
      default: "equal",
    },
    allocations: {
      type: [allocationSchema],
      default: [],
      validate(v) {
        if (!Array.isArray(v) || v.length === 0) {
          throw new Error("Allocations cannot be empty");
        }
      },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

poolExpenseSchema.index(
  { pool: 1, milestone: 1 },
  { unique: true, sparse: true },
);

module.exports = mongoose.model("PoolExpense", poolExpenseSchema);
