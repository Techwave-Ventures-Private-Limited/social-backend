const mongoose = require("mongoose");
const CATEGORY = require("../constants/CategoryEnum");

const postSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["Community", "Post"],
    default: "Post",
  },
  communityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Community",
  },
  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  authorName: {
    type: String,
  },
  authorAvatar: {
    type: String,
    default: null,
  },
  subtype: {
    type: String,
    enum: ["text", "question", "poll", "resource"],
    default: "text",
  },
  discription: {
    type: String,
  },
  media: [
    {
      type: String,
    },
  ],
  postType: {
    type: String,
    enum: ["public", "private"],
    required: true,
  },
  likes: {
    type: Number,
    default: 0,
  },
  comments: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
      default: "",
    },
  ],
  userId: {
    type: String,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
  },
  originalPostId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Post",
  },
  isReposted: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  isPinned: {
    type: Boolean,
    default: false,
  },
  pinnedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  pinnedAt: {
    type: Date,
    default: null,
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  deletedAt: {
    type: Date,
    default: null,
  },
  // For Q&A specific fields
  isAnswered: {
    type: Boolean,
    default: false,
  },
  acceptedAnswerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "CommunityComment",
    default: null,
  },
  // Poll specific fields (for future use)
  pollOptions: [{
    option: String,
    votes: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    }],
  }],
  // Resource specific fields (for future use)
  resourceUrl: {
    type: String,
    default: null,
  },
  resourceType: {
    type: String,
    enum: ["pdf", "link", "video", "document"],
    default: null,
  },
  category: {
    type: String,
    enum: Object.values(CATEGORY),
    default: "Technology & IT"
  },
  engagementScore: {
    type: Number,
    default: 0,
    index: true
  },
  lastEngagementAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  commentsCount: {
    type: Number,
    default : 0
  }
});

postSchema.index({ createdAt: -1 });
postSchema.index({ isDeleted: 1, createdAt: -1 });
postSchema.index({ category: 1, isDeleted: 1, createdAt: -1 });
postSchema.index({ authorId: 1, isDeleted: 1, createdAt: -1 });
postSchema.index({ communityId: 1, isDeleted: 1, createdAt: -1 });
postSchema.index({ type: 1, category: 1, isDeleted: 1, createdAt: -1 });
postSchema.index({ originalPostId: 1 });
postSchema.index({ isPinned: 1, pinnedAt: -1 });
postSchema.index({ engagementScore: -1, lastEngagementAt: -1 });

module.exports = mongoose.model("Post", postSchema);
