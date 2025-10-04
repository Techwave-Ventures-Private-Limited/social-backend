const mongoose = require('mongoose');
const { Schema } = mongoose;

const LikeSchema = new Schema(
  {
    postId: { type: Schema.Types.ObjectId, ref: 'Post', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

// Enforce 1 like per (post,user)
LikeSchema.index({ postId: 1, userId: 1 }, { unique: true, name: 'uniq_post_user' });

module.exports = mongoose.models.Like || mongoose.model('Like', LikeSchema, 'likes');
