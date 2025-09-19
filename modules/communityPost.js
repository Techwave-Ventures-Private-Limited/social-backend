const mongoose = require("mongoose");

const communityPostSchema = new mongoose.Schema({
    communityId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Community",
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
    images: [{
        type: String
    }],
    type: {
        type: String,
        enum: ['text', 'question', 'poll', 'resource'],
        default: 'text'
    },
    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],
    comments: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "CommunityComment"
    }],
    isPinned: {
        type: Boolean,
        default: false
    },
    pinnedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    },
    pinnedAt: {
        type: Date,
        default: null
    },
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
    },
    // For Q&A specific fields
    isAnswered: {
        type: Boolean,
        default: false
    },
    acceptedAnswerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "CommunityComment",
        default: null
    },
    // Poll specific fields (for future use)
    pollOptions: [{
        option: String,
        votes: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }]
    }],
    // Resource specific fields (for future use)
    resourceUrl: {
        type: String,
        default: null
    },
    resourceType: {
        type: String,
        enum: ['pdf', 'link', 'video', 'document'],
        default: null
    }
}, {
    timestamps: true
});

// Index for performance
communityPostSchema.index({ communityId: 1, createdAt: -1 });
communityPostSchema.index({ authorId: 1, createdAt: -1 });
communityPostSchema.index({ type: 1, communityId: 1 });
communityPostSchema.index({ isPinned: -1, createdAt: -1 });

module.exports = mongoose.model("CommunityPost", communityPostSchema);
