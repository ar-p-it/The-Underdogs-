// import express from "express";
// import Pool from "../models/pool.js";
// import Milestone from "../models/milestone.js";
// import Group from "../models/group.js";
// import { userAuth } from "../middleware/adminAuth.js";

const express = require("express");
const Pool = require("../models/pool");
const Milestone = require("../models/milestone");
const Group = require("../models/group");
const { userAuth } = require("../middleware/adminAuth");

const poolsRouter = express.Router();

// Get pool details for a group
poolsRouter.get("/group/:groupId", userAuth, async (req, res) => {
  try {
    const { groupId } = req.params;

    // Find pool by group ID
    let pool = await Pool.findOne({ group: groupId })
      .populate("contributions.user", "firstName lastName email")
      .populate("milestones");

    if (!pool) {
      // Pool doesn't exist, create one for this group
      console.log("[Pools] Creating new pool for group:", groupId);

      const group = await Group.findById(groupId);
      if (!group) {
        return res
          .status(404)
          .json({ success: false, message: "Group not found" });
      }

      pool = new Pool({
        group: groupId,
        totalAmount: group.poolAmount || 0,
        currency: group.currency || "USDC",
        settlementDestination: group.finternetWalletId,
        createdBy: req.user._id,
      });

      await pool.save();

      // Update group with poolId
      group.poolId = pool._id;
      await group.save();
    }

    res.status(200).json({
      success: true,
      pool,
    });
  } catch (err) {
    console.error("[Pools Error]", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get pool by pool ID
poolsRouter.get("/:poolId", userAuth, async (req, res) => {
  try {
    const { poolId } = req.params;
    const pool = await Pool.findById(poolId)
      .populate("contributions.user", "firstName lastName email")
      .populate("milestones");

    if (!pool) {
      return res
        .status(404)
        .json({ success: false, message: "Pool not found" });
    }

    res.status(200).json({
      success: true,
      pool,
    });
  } catch (err) {
    console.error("[Pools Error]", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get all milestones for a pool
poolsRouter.get("/:poolId/milestones", userAuth, async (req, res) => {
  try {
    const { poolId } = req.params;
    const milestones = await Milestone.find({ pool: poolId }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      milestones,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Create a new milestone
poolsRouter.post("/:poolId/milestones", userAuth, async (req, res) => {
  try {
    const { poolId } = req.params;
    const { title, description, releasePercent } = req.body;

    const pool = await Pool.findById(poolId);
    if (!pool) {
      return res
        .status(404)
        .json({ success: false, message: "Pool not found" });
    }

    // Verify user is the group admin
    const group = await Group.findById(pool.group);
    if (group.admin.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Only group admin can create milestones",
      });
    }

    // Calculate release amount
    const releaseAmount = (pool.totalAmount * releasePercent) / 100;

    const milestone = new Milestone({
      pool: poolId,
      title,
      description,
      releasePercent,
      releaseAmount,
    });

    await milestone.save();
    pool.milestones.push(milestone._id);
    await pool.save();

    res.status(201).json({
      success: true,
      message: "Milestone created",
      milestone,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Complete a milestone (release funds)
poolsRouter.post(
  "/:poolId/milestones/:milestoneId/complete",
  userAuth,
  async (req, res) => {
    try {
      const { poolId, milestoneId } = req.params;

      const pool = await Pool.findById(poolId);
      if (!pool) {
        return res
          .status(404)
          .json({ success: false, message: "Pool not found" });
      }

      // Verify user is the group admin
      const group = await Group.findById(pool.group);
      if (group.admin.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: "Only group admin can complete milestones",
        });
      }

      const milestone = await Milestone.findById(milestoneId);
      if (!milestone) {
        return res
          .status(404)
          .json({ success: false, message: "Milestone not found" });
      }

      if (milestone.status === "COMPLETED") {
        return res.status(400).json({
          success: false,
          message: "Milestone already completed",
        });
      }

      // Mark milestone as completed
      milestone.status = "COMPLETED";
      milestone.completedAt = new Date();
      milestone.completedBy = req.user._id;
      await milestone.save();

      // Update pool released amount
      pool.releasedAmount += milestone.releaseAmount;
      await pool.save();

      res.status(200).json({
        success: true,
        message: "Milestone completed and funds released",
        milestone,
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },
);

// Record contribution to pool
poolsRouter.post("/:poolId/contribute", userAuth, async (req, res) => {
  try {
    const { poolId } = req.params;
    const { amount, transactionHash } = req.body;

    const pool = await Pool.findById(poolId);
    if (!pool) {
      return res
        .status(404)
        .json({ success: false, message: "Pool not found" });
    }

    // Check if user already contributed
    const existingContribution = pool.contributions.find(
      (c) => c.user.toString() === req.user._id.toString(),
    );

    if (existingContribution) {
      // Update contribution
      existingContribution.amount += Number(amount);
      existingContribution.transactionHash = transactionHash;
    } else {
      // Add new contribution
      pool.contributions.push({
        user: req.user._id,
        amount: Number(amount),
        transactionHash,
      });
    }

    // Update total amount
    pool.totalAmount += Number(amount);

    // Recalculate milestone release amounts
    for (const milestoneId of pool.milestones) {
      const milestone = await Milestone.findById(milestoneId);
      if (milestone && milestone.status === "PENDING") {
        milestone.releaseAmount =
          (pool.totalAmount * milestone.releasePercent) / 100;
        await milestone.save();
      }
    }

    await pool.save();

    res.status(200).json({
      success: true,
      message: "Contribution recorded",
      pool,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Create pool for a group (called when creating payment intent)
poolsRouter.post("/group/:groupId", userAuth, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { amount, settlementDestination } = req.body;

    const group = await Group.findById(groupId);
    if (!group) {
      return res
        .status(404)
        .json({ success: false, message: "Group not found" });
    }

    // Verify user is the group admin
    if (group.admin.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Only group admin can create pools",
      });
    }

    // Check if pool already exists
    let pool = await Pool.findOne({ group: groupId, status: "ACTIVE" });
    if (pool) {
      return res.status(200).json({
        success: true,
        message: "Pool already exists",
        pool,
      });
    }

    pool = new Pool({
      group: groupId,
      totalAmount: amount || 0,
      currency: group.currency || "USDC",
      settlementDestination,
    });

    await pool.save();

    res.status(201).json({
      success: true,
      message: "Pool created",
      pool,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// export default poolsRouter;
module.exports = poolsRouter;
