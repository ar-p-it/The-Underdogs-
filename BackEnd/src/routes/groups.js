const express = require("express");
const crypto = require("crypto");
const { userAuth } = require("../middleware/adminAuth");
const Group = require("../models/group");
const User = require("../models/user");
const Wallet = require("../models/wallet");

const groupsRouter = express.Router();
// Debug logging to verify requests reach this router
groupsRouter.use((req, _res, next) => {
  console.log(`[GroupsRouter] ${req.method} ${req.originalUrl}`);
  next();
});
const expenseController = require('../controllers/expenseController');

// 1. Create a new event/group
groupsRouter.post("/", userAuth, async (req, res) => {
  try {
    const { name, description, depositAmountPerPerson, currency } = req.body;

    if (!name || !depositAmountPerPerson) {
      return res.status(400).json({
        success: false,
        message: "'name' and 'depositAmountPerPerson' are required",
      });
    }

    if (typeof depositAmountPerPerson !== "number" || depositAmountPerPerson <= 0) {
      return res.status(400).json({
        success: false,
        message: "'depositAmountPerPerson' must be a positive number",
      });
    }

    const groupFinternetId = `POOL_${crypto.randomBytes(6).toString("hex")}`;

    // Create pool wallet record (internal) and link to group
    const poolWallet = await Wallet.create({
      type: "pool",
      finternetWalletId: groupFinternetId,
      currency: currency || "INR",
      balance: 0,
      status: "active",
    });

    const group = await Group.create({
      name,
      description,
      admin: req.user._id,
      depositAmountPerPerson,
      depositCurrency: currency || "INR",
      currency: currency || "INR",
      finternetWalletId: groupFinternetId,
      poolWallet: poolWallet._id,
      participants: [
        {
          user: req.user._id,
          role: "admin",
          deposited: false,
          depositAmount: 0,
          depositCurrency: currency || "INR",
        },
      ],
      status: "open",
      totals: { deposited: 0, spent: 0, remaining: 0 },
    });

    // Link group to creator's user record
    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { groups: group._id },
    });

    return res.status(201).json({
      success: true,
      message: "Group created",
      group,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// 2. Get groups for current user (created or joined)
groupsRouter.get("/my", userAuth, async (req, res) => {
  try {
    const userId = req.user._id;
    const groups = await Group.find({
      $or: [
        { admin: userId },
        { "participants.user": userId },
      ],
    })
      .sort({ updatedAt: -1 })
      .lean();

    res.json({ success: true, groups });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 3. Join a group by ID (from invite link)
groupsRouter.post("/join", userAuth, async (req, res) => {
  try {
    const { groupId } = req.body;
    if (!groupId) {
      return res.status(400).json({ success: false, message: "groupId is required" });
    }
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: "Group not found" });
    }

    const alreadyMember = group.participants.some(p => p.user.toString() === req.user._id.toString());
    if (!alreadyMember) {
      group.participants.push({
        user: req.user._id,
        role: "member",
        deposited: false,
        depositAmount: 0,
        depositCurrency: group.currency || "INR",
      });
      await group.save();

      // Link group to the joining user's record
      await User.findByIdAndUpdate(req.user._id, {
        $addToSet: { groups: group._id },
      });
    }

    res.json({ success: true, group });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 4. Group-scoped expense and balances endpoints
groupsRouter.get('/:groupId/expenses', userAuth, expenseController.getGroupExpenses);
groupsRouter.post('/:groupId/expenses', userAuth, expenseController.postExpense);
groupsRouter.get('/:groupId/balances', userAuth, expenseController.getGroupBalances);

// 5. Get a single group by id (with participants)
// (Must come AFTER specific routes like /my or /join)
groupsRouter.get('/:groupId', userAuth, async (req, res) => {
  try {
    const { groupId } = req.params;
    const group = await Group.findById(groupId).populate('participants.user', 'firstName lastName emailId');
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });
    res.json({ success: true, group });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// MOVE THIS TO THE VERY END
module.exports = groupsRouter;