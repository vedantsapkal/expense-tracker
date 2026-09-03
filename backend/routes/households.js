const express = require("express");
const Household = require("../models/Household");
const Expense = require("../models/Expense");
const Settlement = require("../models/Settlement");
const User = require("../models/User");
const auth = require("../middleware/auth");

const router = express.Router();
router.use(auth);

// Helper: verify requesting user is a member of the household
async function getMemberHousehold(householdId, userId) {
  const household = await Household.findById(householdId).populate(
    "members",
    "name email"
  );
  if (!household) return null;
  const isMember = household.members.some(
    (m) => m._id.toString() === userId.toString()
  );
  return isMember ? household : null;
}

// ─── BALANCE CALCULATION ─────────────────────────────────────────────────────
//
// Returns { balances: Map<userId, Map<userId, Number>> }
// balances[A][B] = amount A owes B  (positive = A owes B)
// After netting: only one direction survives per pair.
//
async function computeBalances(householdId) {
  const expenses = await Expense.find({
    household: householdId,
    isShared: true
  });

  const settlements = await Settlement.find({ household: householdId });

  // raw_debt[debtor][creditor] = amount
  const raw = {};

  function ensure(a, b) {
    if (!raw[a]) raw[a] = {};
    if (!raw[a][b]) raw[a][b] = 0;
  }

  for (const exp of expenses) {
    const paidBy = exp.paidBy.toString();
    for (const split of exp.splits) {
      const debtor = split.user.toString();
      if (debtor === paidBy) continue; // paidBy user's own portion — no debt
      ensure(debtor, paidBy);
      raw[debtor][paidBy] += split.amount;
    }
  }

  for (const s of settlements) {
    const from = s.fromUser.toString();
    const to = s.toUser.toString();
    ensure(from, to);
    raw[from][to] -= s.amount;
    // If overpaid, flip
    if (raw[from][to] < 0) {
      ensure(to, from);
      raw[to][from] += -raw[from][to];
      raw[from][to] = 0;
    }
  }

  // Net out bidirectional debts
  const netted = {};
  const seen = new Set();

  for (const a of Object.keys(raw)) {
    for (const b of Object.keys(raw[a] || {})) {
      const key = [a, b].sort().join("_");
      if (seen.has(key)) continue;
      seen.add(key);

      const aOwesB = (raw[a] && raw[a][b]) || 0;
      const bOwesA = (raw[b] && raw[b][a]) || 0;
      const net = aOwesB - bOwesA;

      if (net > 0.001) {
        if (!netted[a]) netted[a] = {};
        netted[a][b] = net;
      } else if (net < -0.001) {
        if (!netted[b]) netted[b] = {};
        netted[b][a] = -net;
      }
    }
  }

  return netted;
}

// ─── ROUTES ──────────────────────────────────────────────────────────────────

// POST /api/households — Create a new household
router.post("/", async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Household name is required" });
    }

    const household = await Household.create({
      name: name.trim(),
      members: [req.userId],
      createdBy: req.userId
    });

    await household.populate("members", "name email");
    res.status(201).json(household);
  } catch (error) {
    res.status(500).json({ message: "Failed to create household" });
  }
});

// GET /api/households — Get all households the current user belongs to
router.get("/", async (req, res) => {
  try {
    const households = await Household.find({ members: req.userId })
      .populate("members", "name email")
      .sort({ createdAt: -1 });

    res.json(households);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch households" });
  }
});

// GET /api/households/:id — Get household detail
router.get("/:id", async (req, res) => {
  try {
    const household = await getMemberHousehold(req.params.id, req.userId);
    if (!household) {
      return res.status(403).json({ message: "Household not found or access denied" });
    }
    res.json(household);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch household" });
  }
});

// POST /api/households/:id/members — Add member by email
router.post("/:id/members", async (req, res) => {
  try {
    const household = await getMemberHousehold(req.params.id, req.userId);
    if (!household) {
      return res.status(403).json({ message: "Household not found or access denied" });
    }

    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const newMember = await User.findOne({
      email: email.toLowerCase().trim()
    }).select("_id name email");

    if (!newMember) {
      return res.status(404).json({ message: "No user found with that email" });
    }

    const alreadyMember = household.members.some(
      (m) => m._id.toString() === newMember._id.toString()
    );

    if (alreadyMember) {
      return res.status(409).json({ message: "User is already a member" });
    }

    household.members.push(newMember._id);
    await household.save();
    await household.populate("members", "name email");

    res.json(household);
  } catch (error) {
    res.status(500).json({ message: "Failed to add member" });
  }
});

// DELETE /api/households/:id/members/me — Leave household
router.delete("/:id/members/me", async (req, res) => {
  try {
    const household = await getMemberHousehold(req.params.id, req.userId);
    if (!household) {
      return res.status(403).json({ message: "Household not found or access denied" });
    }

    household.members = household.members.filter(
      (m) => m._id.toString() !== req.userId.toString()
    );

    if (household.members.length === 0) {
      // Last member leaving — delete household and all its data
      await Expense.updateMany(
        { household: household._id },
        { $set: { household: null, isShared: false } }
      );
      await Settlement.deleteMany({ household: household._id });
      await household.deleteOne();
      return res.json({ message: "Left and deleted household (you were the last member)" });
    }

    await household.save();
    res.json({ message: "Left household" });
  } catch (error) {
    res.status(500).json({ message: "Failed to leave household" });
  }
});

// GET /api/households/:id/expenses — Shared expenses for this household
router.get("/:id/expenses", async (req, res) => {
  try {
    const household = await getMemberHousehold(req.params.id, req.userId);
    if (!household) {
      return res.status(403).json({ message: "Household not found or access denied" });
    }

    const expenses = await Expense.find({ household: req.params.id, isShared: true })
      .populate("paidBy", "name email")
      .populate("splits.user", "name email")
      .sort({ createdAt: -1 });

    res.json(expenses);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch household expenses" });
  }
});

// GET /api/households/:id/balances — Net who-owes-whom
router.get("/:id/balances", async (req, res) => {
  try {
    const household = await getMemberHousehold(req.params.id, req.userId);
    if (!household) {
      return res.status(403).json({ message: "Household not found or access denied" });
    }

    const netted = await computeBalances(req.params.id);

    // Build user lookup map from household members
    const userMap = {};
    for (const m of household.members) {
      userMap[m._id.toString()] = { id: m._id, name: m.name, email: m.email };
    }

    // Shape into an array: [{debtor, creditor, amount}]
    const balances = [];
    for (const debtorId of Object.keys(netted)) {
      for (const creditorId of Object.keys(netted[debtorId])) {
        const amount = netted[debtorId][creditorId];
        if (amount > 0.001) {
          balances.push({
            debtor: userMap[debtorId] || { id: debtorId, name: "Unknown" },
            creditor: userMap[creditorId] || { id: creditorId, name: "Unknown" },
            amount: Math.round(amount * 100) / 100
          });
        }
      }
    }

    // Also compute per-member summary stats
    const totalShared = await Expense.aggregate([
      { $match: { household: household._id, isShared: true } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);

    const totalAmount = totalShared[0]?.total || 0;

    res.json({ balances, totalShared: totalAmount });
  } catch (error) {
    res.status(500).json({ message: "Failed to calculate balances" });
  }
});

// POST /api/households/:id/settle — Record a settlement
router.post("/:id/settle", async (req, res) => {
  try {
    const household = await getMemberHousehold(req.params.id, req.userId);
    if (!household) {
      return res.status(403).json({ message: "Household not found or access denied" });
    }

    const { toUser: toUserId, amount, note } = req.body;

    if (!toUserId || amount === undefined) {
      return res.status(400).json({ message: "toUser and amount are required" });
    }

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ message: "Amount must be a positive number" });
    }

    // Verify toUser is a household member
    const isToMember = household.members.some(
      (m) => m._id.toString() === toUserId.toString()
    );
    if (!isToMember) {
      return res.status(400).json({ message: "Target user is not a household member" });
    }

    if (req.userId.toString() === toUserId.toString()) {
      return res.status(400).json({ message: "Cannot settle with yourself" });
    }

    const settlement = await Settlement.create({
      household: req.params.id,
      fromUser: req.userId,
      toUser: toUserId,
      amount: numericAmount,
      note: note || ""
    });

    await settlement.populate("fromUser", "name email");
    await settlement.populate("toUser", "name email");

    res.status(201).json(settlement);
  } catch (error) {
    res.status(500).json({ message: "Failed to record settlement" });
  }
});

// GET /api/households/:id/settlements — Settlement history
router.get("/:id/settlements", async (req, res) => {
  try {
    const household = await getMemberHousehold(req.params.id, req.userId);
    if (!household) {
      return res.status(403).json({ message: "Household not found or access denied" });
    }

    const settlements = await Settlement.find({ household: req.params.id })
      .populate("fromUser", "name email")
      .populate("toUser", "name email")
      .sort({ createdAt: -1 });

    res.json(settlements);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch settlements" });
  }
});

module.exports = router;
