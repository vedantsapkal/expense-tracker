const mongoose = require("mongoose");

const settlementSchema = new mongoose.Schema(
  {
    household: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Household",
      required: true
    },
    // Person who is paying the debt
    fromUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    // Person who receives the payment
    toUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    note: {
      type: String,
      default: "",
      trim: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Settlement", settlementSchema);
