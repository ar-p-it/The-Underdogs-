const express = require("express");
const crypto = require("crypto");
const { userAuth } = require("../middleware/adminAuth");
const Group = require("../models/group");
const User = require("../models/user");
const Wallet = require("../models/wallet");
const Expense = require("../models/expense");
const Pool = require("../models/pool");
const Milestone = require("../models/milestone");

const groupsRouter = express.Router();
// Debug logging to verify requests reach this router
groupsRouter.use((req, _res, next) => {
  console.log(`[GroupsRouter] ${req.method} ${req.originalUrl}`);
  next();
});
const expenseController = require("../controllers/expenseController");
const { upload } = require("../utils/upload");

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

    if (
      typeof depositAmountPerPerson !== "number" ||
      depositAmountPerPerson <= 0
    ) {
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
      poolAmount: depositAmountPerPerson * 3, // Default to 3 participants, can be adjusted
      paymentStatus: "AWAITING_CONTRIBUTIONS",
      milestones: [],
      distributions: [],
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

    // Create associated pool
    const pool = await Pool.create({
      group: group._id,
      totalAmount: depositAmountPerPerson * 3,
      currency: currency || "INR",
      status: "ACTIVE",
      settlementDestination: groupFinternetId,
    });

    // Update group with poolId
    group.poolId = pool._id;
    await group.save();

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

// Create Finternet Payment Intent for Group Pool
groupsRouter.post(
  "/:groupId/create-payment-intent",
  userAuth,
  async (req, res) => {
    try {
      const { groupId } = req.params;
      const { totalAmount, numParticipants } = req.body;

      const group = await Group.findById(groupId);
      if (!group) {
        return res
          .status(404)
          .json({ success: false, message: "Group not found" });
      }

      // No role restriction: any authenticated user may create a payment intent.

      // Always create a new intent (don't reuse existing ones)
      const finalAmount = totalAmount || group.poolAmount;

      // Debug: Log the API key
      console.log("USING FINTERNET KEY:", process.env.FINTERNET_API_KEY);
      console.log("KEY LENGTH:", process.env.FINTERNET_API_KEY?.length);
      console.log(
        "KEY STARTS WITH:",
        process.env.FINTERNET_API_KEY?.substring(0, 12),
      );

      // Create payment intent with Finternet API
      const finternetResponse = await fetch(
        "https://api.fmm.finternetlab.io/api/v1/payment-intents",
        {
          method: "POST",
          headers: {
            "X-API-Key": process.env.FINTERNET_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: finalAmount.toString(),
            currency: group.currency || "USDC",
            type: "DELIVERY_VS_PAYMENT",
            settlementMethod: "OFF_RAMP_MOCK",
            settlementDestination: group.finternetWalletId,
            metadata: {
              releaseType: "MILESTONE_LOCKED",
              autoRelease: true,
              groupId: groupId,
              payerType: "MULTIPLE_CONTRIBUTORS",
              expectedContributors:
                numParticipants || group.participants.length,
            },
          }),
        },
      );

      const intentData = await finternetResponse.json();

      if (!finternetResponse.ok) {
        return res.status(400).json({
          success: false,
          message: "Failed to create payment intent",
          error: intentData,
        });
      }

      const intentId = intentData.data.id;

      // Now fetch the full intent details to get the paymentUrl
      console.log("[Finternet] Fetching full intent details for:", intentId);
      const detailsResponse = await fetch(
        `https://api.fmm.finternetlab.io/api/v1/payment-intents/${intentId}`,
        {
          method: "GET",
          headers: {
            "X-API-Key": process.env.FINTERNET_API_KEY,
            "Content-Type": "application/json",
          },
        },
      );

      const detailsData = await detailsResponse.json();

      if (!detailsResponse.ok) {
        console.error(
          "[Finternet] Failed to fetch intent details:",
          detailsData,
        );
        return res.status(400).json({
          success: false,
          message: "Failed to fetch payment intent details",
          error: detailsData,
        });
      }

      // Store intent ID in group
      group.finternetIntentId = intentId;
      group.paymentStatus = "AWAITING_CONTRIBUTIONS";
      group.poolAmount = finalAmount;
      await group.save();

      const paymentUrl = detailsData.data.paymentUrl;

      console.log("[Finternet] Created payment intent:", {
        intentId: intentId,
        groupId: groupId,
        amount: finalAmount,
        walletId: group.finternetWalletId,
        paymentUrl: paymentUrl,
      });

      res.status(201).json({
        success: true,
        message: "Payment intent created",
        intentId: intentId,
        poolUrl: paymentUrl,
        totalPoolAmount: finalAmount,
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },
);

// Register user contribution to shared pool
groupsRouter.post("/:groupId/contribute", userAuth, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { contributionAmount } = req.body;

    const group = await Group.findById(groupId);
    if (!group) {
      return res
        .status(404)
        .json({ success: false, message: "Group not found" });
    }

    if (!group.finternetIntentId) {
      return res.status(400).json({
        success: false,
        message: "Payment intent not created yet. Admin must create it first.",
      });
    }

    // Find or create participant entry
    let participant = group.participants.find(
      (p) => p.user.toString() === req.user._id.toString(),
    );

    if (!participant) {
      // If user not in group yet, add them
      group.participants.push({
        user: req.user._id,
        role: "member",
        depositAmount: contributionAmount,
        depositCurrency: group.currency,
        deposited: false,
      });
    } else {
      // Update contribution amount
      participant.depositAmount = contributionAmount;
      participant.depositCurrency = group.currency;
    }

    await group.save();

    // Add to user's groups if not already there
    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { groups: groupId },
    });

    console.log("[Groups] User registered contribution:", {
      userId: req.user._id,
      groupId: groupId,
      amount: contributionAmount,
    });

    res.status(200).json({
      success: true,
      message:
        "Contribution registered. Share payment URL with all participants.",
      paymentUrl: `https://api.fmm.finternetlab.io/payment/${group.finternetIntentId}`,
      yourAmount: contributionAmount,
      totalPoolTarget: group.poolAmount,
      currentContributions: group.participants.reduce(
        (sum, p) => sum + (p.depositAmount || 0),
        0,
      ),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Verify pool is fully funded
groupsRouter.post("/:groupId/verify-pool", userAuth, async (req, res) => {
  try {
    const { groupId } = req.params;
    const group = await Group.findById(groupId);

    if (!group) {
      return res
        .status(404)
        .json({ success: false, message: "Group not found" });
    }

    if (!group.finternetIntentId) {
      return res.status(400).json({
        success: false,
        message: "No payment intent created",
      });
    }

    // Check intent status via Finternet API
    const checkResponse = await fetch(
      `https://api.fmm.finternetlab.io/api/v1/payment-intents/${group.finternetIntentId}`,
      {
        headers: {
          "X-API-Key": process.env.FINTERNET_API_KEY,
        },
      },
    );

    const intentStatus = await checkResponse.json();

    if (!checkResponse.ok) {
      return res.status(400).json({
        success: false,
        message: "Failed to check payment intent status",
        error: intentStatus,
      });
    }

    const totalReceived = parseFloat(intentStatus.data.amount);
    const expectedTotal = group.poolAmount;

    if (
      totalReceived >= expectedTotal &&
      (intentStatus.data.status === "SUCCEEDED" ||
        intentStatus.data.status === "PROCESSING")
    ) {
      group.paymentStatus = "FUNDED";
      group.participants.forEach((p) => {
        p.deposited = true;
      });
      await group.save();

      return res.status(200).json({
        success: true,
        message: "✅ Pool fully funded!",
        totalAmount: totalReceived,
        status: "FUNDED",
        intentStatus: intentStatus.data.status,
      });
    }

    res.status(200).json({
      success: true,
      message: "Pool verification",
      totalReceived,
      expectedTotal,
      pendingAmount: expectedTotal - totalReceived,
      status: intentStatus.data.status,
      percentageFunded: ((totalReceived / expectedTotal) * 100).toFixed(2),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Release funds from milestone
groupsRouter.post("/:groupId/release-milestone", userAuth, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { milestoneId, milestoneIndex } = req.body;

    const group = await Group.findById(groupId);
    if (!group) {
      return res
        .status(404)
        .json({ success: false, message: "Group not found" });
    }

    // Only admin can release
    if (group.admin.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Only admin can release milestone funds",
      });
    }

    const milestone = group.milestones.find(
      (m) => m.finternetMilestoneId === milestoneId,
    );

    if (!milestone) {
      return res.status(404).json({
        success: false,
        message: "Milestone not found",
      });
    }

    if (milestone.status !== "PENDING") {
      return res.status(400).json({
        success: false,
        message: `Milestone already ${milestone.status.toLowerCase()}`,
      });
    }

    // Call Finternet API to complete milestone
    const completeResponse = await fetch(
      `https://api.fmm.finternetlab.io/api/v1/payment-intents/${group.finternetIntentId}/escrow/milestones/${milestoneId}/complete`,
      {
        method: "POST",
        headers: {
          "X-API-Key": process.env.FINTERNET_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          completedBy: req.user.walletAddress || req.user._id.toString(),
          completionProof: `Milestone ${milestoneIndex} completed for group ${groupId}`,
          completionProofURI: `https://your-app.com/groups/${groupId}/milestone/${milestoneIndex}`,
        }),
      },
    );

    const result = await completeResponse.json();

    if (!completeResponse.ok) {
      return res.status(400).json({
        success: false,
        message: "Failed to release milestone funds",
        error: result,
      });
    }

    // Update milestone status
    milestone.status = "RELEASED";
    milestone.releasedAmount = milestone.amount;
    milestone.releasedAt = new Date();
    milestone.completedBy = req.user._id;

    // Distribute released amount equally among all participants
    const amountPerUser = milestone.amount / group.participants.length;

    const newDistributions = group.participants.map((p) => ({
      user: p.user,
      milestoneIndex: milestone.index,
      amount: amountPerUser,
      status: "RELEASED",
      releasedAt: new Date(),
    }));

    group.distributions.push(...newDistributions);
    await group.save();

    console.log("[Finternet] Milestone released:", {
      groupId: groupId,
      milestoneIndex: milestoneIndex,
      totalReleased: milestone.amount,
      perUserAmount: amountPerUser,
      participants: group.participants.length,
    });

    res.status(200).json({
      success: true,
      message: `Released ${milestone.amount} from milestone ${milestoneIndex}`,
      milestone: {
        index: milestone.index,
        totalReleased: milestone.amount,
        perUserAmount: amountPerUser,
        releasedAt: milestone.releasedAt,
      },
      distributions: newDistributions,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 2. Get groups for current user (created or joined)
groupsRouter.get("/my", userAuth, async (req, res) => {
  try {
    const userId = req.user._id;
    const groups = await Group.find({
      $or: [{ admin: userId }, { "participants.user": userId }],
    })
      .sort({ updatedAt: -1 })
      .lean();

    res.json({ success: true, groups });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// User summary across all joined/created groups
groupsRouter.get("/summary/my", userAuth, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const groups = await Group.find({
      $or: [{ admin: userId }, { "participants.user": userId }],
    }).select({ _id: 1, name: 1, currency: 1 });

    let totalNet = 0;
    let youAreOwed = 0;
    let youOwe = 0;
    let monthlySpending = 0;
    let yearlyTotal = 0;
    const recent = [];

    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    for (const g of groups) {
      const expenses = await Expense.find({ group: g._id }).select({
        amount: 1,
        currency: 1,
        paidBy: 1,
        splits: 1,
        createdAt: 1,
      });
      for (const exp of expenses) {
        const amt = Number(exp.amount) || 0;
        const isPaidByUser = exp.paidBy?.toString?.() === userId;
        const userSplit = (exp.splits || []).find(
          (s) => s.user?.toString?.() === userId,
        );
        const splitAmt = Number(userSplit?.amount || 0);
        // net balance effect
        if (isPaidByUser) totalNet += amt;
        if (splitAmt > 0) totalNet -= splitAmt;

        // monthly/yearly spending (based on user's split)
        if (splitAmt > 0) {
          const d = new Date(exp.createdAt);
          if (d.getFullYear() === thisYear) {
            yearlyTotal += splitAmt;
            if (d.getMonth() === thisMonth) monthlySpending += splitAmt;
          }
          // recent list
          recent.push({
            groupName: g.name,
            amount: splitAmt,
            currency: exp.currency || g.currency || "INR",
            date: d,
          });
        }
      }
    }

    if (totalNet > 0) youAreOwed = totalNet;
    else youOwe = Math.abs(totalNet);

    // Sort recent by date desc and limit to 5
    recent.sort((a, b) => b.date - a.date);
    const topRecent = recent.slice(0, 5);

    return res.json({
      success: true,
      totalBalance: Number(totalNet.toFixed(2)),
      youAreOwed: Number(youAreOwed.toFixed(2)),
      youOwe: Number(youOwe.toFixed(2)),
      monthlySpending: Number(monthlySpending.toFixed(2)),
      yearlyTotal: Number(yearlyTotal.toFixed(2)),
      recent: topRecent,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// 3. Join a group by ID (from invite link)
groupsRouter.post("/join", userAuth, async (req, res) => {
  try {
    const { groupId } = req.body;
    if (!groupId) {
      return res
        .status(400)
        .json({ success: false, message: "groupId is required" });
    }
    const group = await Group.findById(groupId);
    if (!group) {
      return res
        .status(404)
        .json({ success: false, message: "Group not found" });
    }

    const alreadyMember = group.participants.some(
      (p) => p.user.toString() === req.user._id.toString(),
    );
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

// (Removed) Autopay endpoint

// Create milestones for a group
groupsRouter.post("/:groupId/create-milestone", userAuth, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { milestones } = req.body; // Array of milestone objects

    const group = await Group.findById(groupId);
    if (!group) {
      return res
        .status(404)
        .json({ success: false, message: "Group not found" });
    }

    // Any group member (including admin) can create milestones
    const isAdmin = group.admin.toString() === req.user._id.toString();
    const isParticipant = (group.participants || []).some(
      (p) => p.user.toString() === req.user._id.toString(),
    );
    if (!isAdmin && !isParticipant) {
      return res.status(403).json({
        success: false,
        message: "Only group members can create milestones",
      });
    }

    if (!group.finternetIntentId) {
      return res.status(400).json({
        success: false,
        message: "Payment intent not created yet",
      });
    }

    const createdMilestones = [];

    // Create each milestone via Finternet API
    for (const milestone of milestones) {
      const finternetResponse = await fetch(
        `https://api.fmm.finternetlab.io/api/v1/payment-intents/${group.finternetIntentId}/escrow/milestones`,
        {
          method: "POST",
          headers: {
            "X-API-Key": process.env.FINTERNET_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            milestoneIndex: milestone.milestoneIndex,
            description: milestone.description,
            amount: milestone.amount.toString(),
            percentage: milestone.percentage,
          }),
        },
      );

      const milestoneData = await finternetResponse.json();

      if (!finternetResponse.ok) {
        return res.status(400).json({
          success: false,
          message: `Failed to create milestone ${milestone.milestoneIndex}`,
          error: milestoneData,
        });
      }

      createdMilestones.push({
        finternetMilestoneId: milestoneData.data.id,
        index: milestone.milestoneIndex,
        description: milestone.description,
        amount: milestone.amount,
        percentage: milestone.percentage,
        status: "PENDING",
      });
    }

    // Store milestones in group document
    group.milestones = createdMilestones;
    await group.save();

    console.log("[Finternet] Created milestones:", {
      groupId: groupId,
      count: createdMilestones.length,
      milestones: createdMilestones.map((m) => ({
        index: m.index,
        amount: m.amount,
      })),
    });

    res.status(201).json({
      success: true,
      message: "Milestones created",
      milestones: createdMilestones,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 4. Group-scoped expense and balances endpoints
groupsRouter.get(
  "/:groupId/expenses",
  userAuth,
  expenseController.getGroupExpenses,
);
groupsRouter.post(
  "/:groupId/expenses",
  userAuth,
  expenseController.postExpense,
);
groupsRouter.get(
  "/:groupId/balances",
  userAuth,
  expenseController.getGroupBalances,
);

// OCR + Analyze receipt (multipart/form-data)
groupsRouter.post(
  "/:groupId/analyze-receipt",
  userAuth,
  upload.single("image"),
  expenseController.analyzeReceipt,
);

// 5. Get a single group by id (with participants)
// (Must come AFTER specific routes like /my or /join)
groupsRouter.get("/:groupId", userAuth, async (req, res) => {
  try {
    const { groupId } = req.params;
    const group = await Group.findById(groupId).populate(
      "participants.user",
      "firstName lastName emailId",
    );
    if (!group)
      return res
        .status(404)
        .json({ success: false, message: "Group not found" });
    // Enforce membership visibility: only admin or participants can view group
    const isAdmin = group.admin.toString() === req.user._id.toString();
    const isParticipant = group.participants.some(
      (p) =>
        p.user._id?.toString?.() === req.user._id.toString() ||
        p.user.toString?.() === req.user._id.toString(),
    );
    if (!isAdmin && !isParticipant) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: not a member of this group",
      });
    }
    res.json({ success: true, group });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// MOVE THIS TO THE VERY END
module.exports = groupsRouter;
