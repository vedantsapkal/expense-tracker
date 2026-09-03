const express = require("express");
const Expense = require("../models/Expense");
const Household = require("../models/Household");
const auth = require("../middleware/auth");

const router = express.Router();

router.use(auth);

const VALID_PAYMENT_METHODS = ["Cash", "UPI", "Card", "Bank Transfer"];

// Helper: validate a shared expense's splits
async function validateSharedExpense({ householdId, paidBy, splits, splitType, amount, userId }) {
  // Verify household exists and user is a member
  const household = await Household.findById(householdId);
  if (!household) {
    return { error: "Household not found" };
  }
  const memberIds = household.members.map((m) => m.toString());
  if (!memberIds.includes(userId.toString())) {
    return { error: "You are not a member of this household" };
  }

  // Validate paidBy is a member
  if (!paidBy || !memberIds.includes(paidBy.toString())) {
    return { error: "Paid-by user must be a household member" };
  }

  if (splitType === "equal") {
    // splitBetween is an array of user IDs; backend calculates amounts
    const splitBetween = splits; // array of userIds
    if (!splitBetween || splitBetween.length === 0) {
      return { error: "Select at least one person to split between" };
    }
    // Validate all are members
    for (const uid of splitBetween) {
      if (!memberIds.includes(uid.toString())) {
        return { error: "All split participants must be household members" };
      }
    }
    const perPerson = Math.round((amount / splitBetween.length) * 100) / 100;
    const calculatedSplits = splitBetween.map((uid, i) => {
      // Distribute rounding difference to last participant
      const isLast = i === splitBetween.length - 1;
      const othersTotal = perPerson * (splitBetween.length - 1);
      return {
        user: uid,
        amount: isLast
          ? Math.round((amount - othersTotal) * 100) / 100
          : perPerson
      };
    });
    return { calculatedSplits, household };
  }

  if (splitType === "custom") {
    // splits is array of {user, amount}
    if (!splits || splits.length === 0) {
      return { error: "At least one split entry is required" };
    }
    for (const s of splits) {
      if (!s.user || !memberIds.includes(s.user.toString())) {
        return { error: "All split participants must be household members" };
      }
      const n = Number(s.amount);
      if (!Number.isFinite(n) || n < 0) {
        return { error: "Split amounts must be valid non-negative numbers" };
      }
    }
    const total = splits.reduce((sum, s) => sum + Number(s.amount), 0);
    if (Math.abs(total - amount) > 0.01) {
      return {
        error: `Split amounts (₹${total.toFixed(2)}) must equal the total expense amount (₹${amount.toFixed(2)})`
      };
    }
    return { calculatedSplits: splits, household };
  }

  return { error: "Invalid split type. Use 'equal' or 'custom'" };
}

// GET / — Latest added record first
router.get("/", async (req, res) => {
  try {
    const expenses = await Expense.find({ user: req.userId })
      .populate("paidBy", "name")
      .populate("household", "name")
      .sort({ createdAt: -1 });

    res.json(expenses);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch expenses" });
  }
});

// POST / — Create expense (personal or shared)
router.post("/", async (req, res) => {
  try {
    const {
      category,
      amount,
      comments,
      paymentMethod,
      isShared,
      household: householdId,
      paidBy,
      splits,
      splitType
    } = req.body;

    if (!category || amount === undefined || amount === "") {
      return res.status(400).json({ message: "Category and amount are required" });
    }

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount < 0) {
      return res
        .status(400)
        .json({ message: "Amount must be a valid non-negative number" });
    }

    if (paymentMethod && !VALID_PAYMENT_METHODS.includes(paymentMethod)) {
      return res.status(400).json({ message: "Invalid payment method" });
    }

    // Build base expense data
    const expenseData = {
      user: req.userId,
      category,
      amount: numericAmount,
      comments: comments || "",
      paymentMethod: paymentMethod || null
    };

    if (isShared) {
      const result = await validateSharedExpense({
        householdId,
        paidBy,
        splits,
        splitType,
        amount: numericAmount,
        userId: req.userId
      });

      if (result.error) {
        return res.status(400).json({ message: result.error });
      }

      expenseData.isShared = true;
      expenseData.household = householdId;
      expenseData.paidBy = paidBy;
      expenseData.splits = result.calculatedSplits;
    }

    const expense = await Expense.create(expenseData);
    await expense.populate("paidBy", "name");
    await expense.populate("household", "name");

    res.status(201).json(expense);
  } catch (error) {
    res.status(500).json({ message: "Failed to add expense" });
  }
});

// PUT /:id — Update expense
router.put("/:id", async (req, res) => {
  try {
    const {
      category,
      amount,
      comments,
      paymentMethod,
      isShared,
      household: householdId,
      paidBy,
      splits,
      splitType
    } = req.body;

    const expense = await Expense.findOne({
      _id: req.params.id,
      user: req.userId
    });

    if (!expense) {
      return res.status(404).json({ message: "Expense not found" });
    }

    if (category !== undefined) expense.category = category;
    if (comments !== undefined) expense.comments = comments;

    if (paymentMethod !== undefined) {
      if (paymentMethod !== null && !VALID_PAYMENT_METHODS.includes(paymentMethod)) {
        return res.status(400).json({ message: "Invalid payment method" });
      }
      expense.paymentMethod = paymentMethod;
    }

    if (amount !== undefined) {
      const numericAmount = Number(amount);
      if (!Number.isFinite(numericAmount) || numericAmount < 0) {
        return res.status(400).json({ message: "Amount must be valid" });
      }
      expense.amount = numericAmount;
    }

    // Handle shared expense update
    if (isShared !== undefined) {
      if (isShared) {
        const result = await validateSharedExpense({
          householdId: householdId || expense.household,
          paidBy: paidBy || expense.paidBy,
          splits,
          splitType,
          amount: expense.amount,
          userId: req.userId
        });
        if (result.error) {
          return res.status(400).json({ message: result.error });
        }
        expense.isShared = true;
        expense.household = householdId || expense.household;
        expense.paidBy = paidBy || expense.paidBy;
        expense.splits = result.calculatedSplits;
      } else {
        expense.isShared = false;
        expense.household = null;
        expense.paidBy = null;
        expense.splits = [];
      }
    }

    await expense.save();
    await expense.populate("paidBy", "name");
    await expense.populate("household", "name");

    res.json(expense);
  } catch (error) {
    res.status(500).json({ message: "Failed to update expense" });
  }
});

// DELETE /:id
router.delete("/:id", async (req, res) => {
  try {
    const expense = await Expense.findOneAndDelete({
      _id: req.params.id,
      user: req.userId
    });

    if (!expense) {
      return res.status(404).json({ message: "Expense not found" });
    }

    res.json({ message: "Expense deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete expense" });
  }
});

module.exports = router;
