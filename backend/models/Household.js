const mongoose = require("mongoose");

const householdSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Household", householdSchema);
