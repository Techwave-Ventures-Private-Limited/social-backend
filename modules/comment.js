const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  story: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Story', // Reference to the Story model
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Reference to the User model
    required: true
  },
  text: {
    type: String,
    required: true,
    trim: true
  },
  isLiked: {
    type: Boolean,
    default: false
  },
  likesCount: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Comment = mongoose.model('StoryComment', commentSchema);

module.exports = Comment;