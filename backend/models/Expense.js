const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    category: {
      type: String,
      required: true,
      trim: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    comments: {
      type: String,
      default: "",
      trim: true
    },

    // --- Payment Method (optional) ---
    paymentMethod: {
      type: String,
      enum: ["Cash", "UPI", "Card", "Bank Transfer", null],
      default: null
    },

    // --- Shared Expense fields (all optional, safe for existing records) ---
    isShared: {
      type: Boolean,
      default: false
    },
    household: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Household",
      default: null
    },
    paidBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    // Who owes what portion of this expense
    splits: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        amount: { type: Number, min: 0 }
      }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model("Expense", expenseSchema);
