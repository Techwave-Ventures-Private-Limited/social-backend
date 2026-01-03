const mongoose = require("mongoose");

const hashtagSchema = new mongoose.Schema({
  tag: {
    type: String,
    required: true,
    lowercase: true,
    unique: true,
    index: true
  },
  usageCount: {
    type: Number,
    default: 0,
    index: true
  },
  lastUsedAt: {
    type: Date,
    default: Date.now
  },
  trendingScore: { // Not using this now adding for future trending hashtags page
    type: Number,
    default: 0,
    index: true
  }
}, { timestamps: true });

module.exports = mongoose.model("Hashtag", hashtagSchema);
