const mongoose = require("mongoose");

const connectionSchema = new mongoose.Schema({
  follower: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "User",
    index: true,
  },
  following: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "User",
    index: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

connectionSchema.index({ follower: 1, following: 1 }, { unique: true });
connectionSchema.index({ follower: 1 }, { unique: true });
connectionSchema.index({ following: 1 }, { unique: true });

module.exports = mongoose.model("Follow", connectionSchema);
