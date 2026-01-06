const mongoose = require("mongoose");

const purchaseSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
      required: true,
    },

    amountPaid: {
      type: Number,
      required: true,
    },

    currency: {
      type: String,
      default: "INR",
    },

    status: {
      type: String,
      enum: ["active", "expired", "cancelled", "pending"],
      default: "pending",
      index: true,
    },

    startDate: {
      type: Date,
    },

    endDate: {
      type: Date,
      index: true,
    },

    paymentProvider: {
      type: String,
    },

    paymentId: {
      type: String,
    },

    isAutoRenew: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

purchaseSchema.index({ userId: 1, status: 1 });
purchaseSchema.index({ endDate: 1 });

module.exports = mongoose.model("Purchase", purchaseSchema);
