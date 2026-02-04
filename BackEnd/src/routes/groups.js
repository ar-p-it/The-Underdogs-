const express = require("express");
const crypto = require("crypto");
const { userAuth } = require("../middleware/adminAuth");
const Group = require("../models/group");
const Wallet = require("../models/wallet");

const groupsRouter = express.Router();

// Create a new event/group
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

module.exports = groupsRouter;
