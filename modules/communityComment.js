const mongoose = require("mongoose");

const communityCommentSchema = new mongoose.Schema({
    postId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Post",
        required: true
    },
    authorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    authorName: {
        type: String,
        required: true
    },
    authorAvatar: {
        type: String,
        default: null
    },
    content: {
        type: String,
        required: true,
        trim: true
    },
    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],
    // For Q&A: Mark if this is an accepted answer
    isAcceptedAnswer: {
        type: Boolean,
        default: false
    },
    acceptedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    },
    acceptedAt: {
        type: Date,
        default: null
    },
    // For nested replies (optional - can be implemented later)
    parentCommentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "CommunityComment",
        default: null
    },
    replies: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "CommunityComment"
    }],
    isDeleted: {
        type: Boolean,
        default: false
    },
    deletedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    },
    deletedAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

// Index for performance
communityCommentSchema.index({ postId: 1, createdAt: -1 });
communityCommentSchema.index({ authorId: 1, createdAt: -1 });
communityCommentSchema.index({ isAcceptedAnswer: 1 });

module.exports = mongoose.model("CommunityComment", communityCommentSchema);
