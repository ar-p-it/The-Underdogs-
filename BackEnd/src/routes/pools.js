// import express from "express";
// import Pool from "../models/pool.js";
// import Milestone from "../models/milestone.js";
// import Group from "../models/group.js";
// import { userAuth } from "../middleware/adminAuth.js";

const express = require("express");
const Pool = require("../models/pool");
const Milestone = require("../models/milestone");
const Group = require("../models/group");
const PoolExpense = require("../models/poolExpense");
const { userAuth } = require("../middleware/adminAuth");

const poolsRouter = express.Router();

function toCents(amount) {
  return Math.round(Number(amount || 0) * 100);
}

function fromCents(cents) {
  return Number((cents / 100).toFixed(2));
}

function isGroupMember(groupDoc, userId) {
  if (!groupDoc || !userId) return false;
  if (groupDoc.admin?.toString?.() === userId.toString()) return true;
  return (groupDoc.participants || []).some(
    (p) => p.user?.toString?.() === userId.toString(),
  );
}

function computeAllocations({ amount, splitMethod, participants, splits }) {
  const amountCents = toCents(amount);
  if (!participants || participants.length === 0) {
    throw new Error("At least one participant is required");
  }
  if (amountCents <= 0) {
    throw new Error("Amount must be greater than 0");
  }

  const participantIds = participants.map((p) => p.toString());
  const splitMap = new Map();
  (splits || []).forEach((s) => {
    if (!s?.user) return;
    splitMap.set(s.user.toString(), s);
  });

  if (splitMethod === "equal") {
    const per = Math.floor(amountCents / participantIds.length);
    let remainder = amountCents - per * participantIds.length;
    return participantIds.map((userId) => {
      const extra = remainder > 0 ? 1 : 0;
      remainder -= extra;
      return { user: userId, amount: fromCents(per + extra) };
    });
  }

  if (splitMethod === "exact") {
    const allocations = participantIds.map((userId) => {
      const s = splitMap.get(userId);
      const cents = toCents(s?.amount || 0);
      return { user: userId, cents };
    });
    const sum = allocations.reduce((acc, a) => acc + a.cents, 0);
    if (sum !== amountCents) {
      throw new Error(
        `Exact split amounts must sum to ${fromCents(amountCents)} (got ${fromCents(sum)})`,
      );
    }
    return allocations.map((a) => ({
      user: a.user,
      amount: fromCents(a.cents),
    }));
  }

  if (splitMethod === "percent") {
    const percents = participantIds.map((userId) => {
      const s = splitMap.get(userId);
      return { user: userId, percent: Number(s?.percent || 0) };
    });
    const totalPercent = percents.reduce((acc, p) => acc + p.percent, 0);
    if (Math.round(totalPercent * 100) !== 10000) {
      throw new Error("Percent split must sum to 100%");
    }
    let used = 0;
    const raw = percents.map((p) => {
      const cents = Math.floor((amountCents * p.percent) / 100);
      used += cents;
      return { user: p.user, cents };
    });
    let remainder = amountCents - used;
    for (let i = 0; i < raw.length && remainder > 0; i++) {
      raw[i].cents += 1;
      remainder -= 1;
    }
    return raw.map((r) => ({ user: r.user, amount: fromCents(r.cents) }));
  }

  if (splitMethod === "shares") {
    const shares = participantIds.map((userId) => {
      const s = splitMap.get(userId);
      return { user: userId, shares: Number(s?.shares || 0) };
    });
    const totalShares = shares.reduce((acc, s) => acc + s.shares, 0);
    if (totalShares <= 0) {
      throw new Error("Shares split requires total shares > 0");
    }
    let used = 0;
    const raw = shares.map((s) => {
      const cents = Math.floor((amountCents * s.shares) / totalShares);
      used += cents;
      return { user: s.user, cents };
    });
    let remainder = amountCents - used;
    for (let i = 0; i < raw.length && remainder > 0; i++) {
      raw[i].cents += 1;
      remainder -= 1;
    }
    return raw.map((r) => ({ user: r.user, amount: fromCents(r.cents) }));
  }

  throw new Error("Invalid split method");
}

function computeSuggestedTransfers(memberSummaries) {
  const creditors = [];
  const debtors = [];

  for (const m of memberSummaries) {
    const netCents = toCents(m.net);
    if (netCents > 0) creditors.push({ user: m.user, cents: netCents });
    else if (netCents < 0) debtors.push({ user: m.user, cents: -netCents });
  }

  creditors.sort((a, b) => b.cents - a.cents);
  debtors.sort((a, b) => b.cents - a.cents);

  const transfers = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].cents, creditors[j].cents);
    if (pay > 0) {
      transfers.push({
        from: debtors[i].user,
        to: creditors[j].user,
        amount: fromCents(pay),
      });
      debtors[i].cents -= pay;
      creditors[j].cents -= pay;
    }
    if (debtors[i].cents === 0) i++;
    if (creditors[j].cents === 0) j++;
  }
  return transfers;
}

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
    const { title, description, releaseAmount, releasePercent } = req.body;

    const pool = await Pool.findById(poolId);
    if (!pool) {
      return res
        .status(404)
        .json({ success: false, message: "Pool not found" });
    }

    // Any authenticated group member (including admin) can create milestones.
    const group = await Group.findById(pool.group).populate(
      "participants.user",
    );
    if (!group) {
      return res
        .status(404)
        .json({ success: false, message: "Group not found" });
    }
    if (!isGroupMember(group, req.user._id)) {
      return res.status(403).json({
        success: false,
        message: "Only group members can create milestones",
      });
    }

    // Prefer fixed amount milestones.
    let computedReleaseAmount =
      releaseAmount !== undefined && releaseAmount !== null
        ? Number(releaseAmount)
        : null;

    // Backward compatibility: percent-based milestones
    let computedReleasePercent =
      releasePercent !== undefined && releasePercent !== null
        ? Number(releasePercent)
        : null;

    if (
      (computedReleaseAmount === null || Number.isNaN(computedReleaseAmount)) &&
      computedReleasePercent !== null &&
      !Number.isNaN(computedReleasePercent)
    ) {
      computedReleaseAmount = (pool.totalAmount * computedReleasePercent) / 100;
    }

    if (computedReleaseAmount === null || Number.isNaN(computedReleaseAmount)) {
      return res.status(400).json({
        success: false,
        message: "releaseAmount is required",
      });
    }

    if (computedReleaseAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "releaseAmount must be greater than 0",
      });
    }

    const locked =
      Number(pool.totalAmount || 0) - Number(pool.releasedAmount || 0);
    if (computedReleaseAmount > locked) {
      return res.status(400).json({
        success: false,
        message: `releaseAmount cannot exceed locked amount (${locked})`,
      });
    }

    const milestone = new Milestone({
      pool: poolId,
      title,
      description,
      releasePercent: computedReleasePercent,
      releaseAmount: computedReleaseAmount,
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

      const {
        participants,
        splitMethod = "equal",
        splits = [],
      } = req.body || {};

      const pool = await Pool.findById(poolId);
      if (!pool) {
        return res
          .status(404)
          .json({ success: false, message: "Pool not found" });
      }

      // Verify user is a group member (or admin)
      const group = await Group.findById(pool.group).populate(
        "participants.user",
        "firstName lastName emailId",
      );
      if (!group) {
        return res
          .status(404)
          .json({ success: false, message: "Group not found" });
      }
      // No role/membership restriction: any authenticated user may complete milestones.

      const milestone = await Milestone.findById(milestoneId);
      if (!milestone) {
        return res
          .status(404)
          .json({ success: false, message: "Milestone not found" });
      }

      if (milestone.pool.toString() !== poolId.toString()) {
        return res.status(400).json({
          success: false,
          message: "Milestone does not belong to this pool",
        });
      }

      if (milestone.status === "COMPLETED") {
        return res.status(400).json({
          success: false,
          message: "Milestone already completed",
        });
      }

      // Determine who shares this deduction
      const defaultParticipantIds = (group.participants || []).map((p) =>
        (p.user?._id || p.user).toString(),
      );

      const selectedParticipantIds = Array.isArray(participants)
        ? participants.map((p) => p.toString())
        : [];

      const participantIdsToUse =
        selectedParticipantIds.length > 0
          ? selectedParticipantIds
          : defaultParticipantIds;

      // Validate participants are in the group
      const groupSet = new Set(defaultParticipantIds);
      const invalid = participantIdsToUse.filter((id) => !groupSet.has(id));
      if (invalid.length > 0) {
        return res.status(400).json({
          success: false,
          message: "One or more selected participants are not in the group",
        });
      }

      const allocations = computeAllocations({
        amount: milestone.releaseAmount,
        splitMethod,
        participants: participantIdsToUse,
        splits,
      });

      const poolExpense = await PoolExpense.create({
        pool: pool._id,
        group: group._id,
        milestone: milestone._id,
        title: milestone.title,
        description: milestone.description,
        amount: milestone.releaseAmount,
        currency: pool.currency,
        splitMethod,
        allocations,
        createdBy: req.user._id,
      });

      // Mark milestone as completed
      milestone.status = "COMPLETED";
      milestone.completedAt = new Date();
      milestone.completedBy = req.user._id;
      milestone.expense = poolExpense._id;
      await milestone.save();

      // Update pool released amount
      pool.releasedAmount += milestone.releaseAmount;
      await pool.save();

      res.status(200).json({
        success: true,
        message: "Milestone completed and funds released",
        milestone,
        poolExpense,
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },
);

// Pool settlement summary: contributed vs spent per member + suggested transfers
poolsRouter.get("/:poolId/settlement", userAuth, async (req, res) => {
  try {
    const { poolId } = req.params;

    const pool = await Pool.findById(poolId).populate(
      "contributions.user",
      "firstName lastName emailId",
    );
    if (!pool) {
      return res
        .status(404)
        .json({ success: false, message: "Pool not found" });
    }

    const group = await Group.findById(pool.group).populate(
      "participants.user",
      "firstName lastName emailId",
    );
    if (!group) {
      return res
        .status(404)
        .json({ success: false, message: "Group not found" });
    }

    // No role/membership restriction: any authenticated user may view settlement.

    const expenses = await PoolExpense.find({ pool: poolId });

    const contributedByUser = new Map();
    for (const c of pool.contributions || []) {
      const id = (c.user?._id || c.user)?.toString?.();
      if (!id) continue;
      contributedByUser.set(
        id,
        (contributedByUser.get(id) || 0) + Number(c.amount || 0),
      );
    }

    const spentByUser = new Map();
    for (const exp of expenses) {
      for (const a of exp.allocations || []) {
        const id = a.user?.toString?.();
        if (!id) continue;
        spentByUser.set(id, (spentByUser.get(id) || 0) + Number(a.amount || 0));
      }
    }

    // Include all relevant users: group participants + pool contributors + anyone in allocations
    const userById = new Map();
    for (const p of group.participants || []) {
      const user = p.user;
      const userId = user?._id?.toString?.() || p.user?.toString?.();
      if (userId) userById.set(userId, user);
    }
    for (const c of pool.contributions || []) {
      const user = c.user;
      const userId = (user?._id || user)?.toString?.();
      if (userId) userById.set(userId, user);
    }

    const allUserIds = new Set([
      ...userById.keys(),
      ...contributedByUser.keys(),
      ...spentByUser.keys(),
    ]);

    const members = Array.from(allUserIds).map((userId) => {
      const user = userById.get(userId) || { _id: userId };
      const contributed = Number(
        (contributedByUser.get(userId) || 0).toFixed(2),
      );
      const spent = Number((spentByUser.get(userId) || 0).toFixed(2));
      const net = Number((contributed - spent).toFixed(2));
      return { user, userId, contributed, spent, net };
    });

    const totalContributed = Number(
      [...contributedByUser.values()].reduce((a, b) => a + b, 0).toFixed(2),
    );
    const totalSpent = Number(
      [...spentByUser.values()].reduce((a, b) => a + b, 0).toFixed(2),
    );
    const remainingAmount = Number((totalContributed - totalSpent).toFixed(2));

    const transfers = computeSuggestedTransfers(
      members.map((m) => ({ user: m.user, net: m.net })),
    );

    res.status(200).json({
      success: true,
      currency: pool.currency,
      totals: {
        contributed: totalContributed,
        spent: totalSpent,
        remaining: remainingAmount,
      },
      members,
      transfers,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

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
        if (
          milestone.releasePercent !== undefined &&
          milestone.releasePercent !== null
        ) {
          milestone.releaseAmount =
            (pool.totalAmount * milestone.releasePercent) / 100;
          await milestone.save();
        }
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
