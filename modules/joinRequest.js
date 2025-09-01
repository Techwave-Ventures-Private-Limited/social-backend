const mongoose = require("mongoose");

const joinRequestSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    userName: {
        type: String,
        required: true
    },
    userAvatar: {
        type: String,
        default: null
    },
    communityId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Community",
        required: true
    },
    message: {
        type: String,
        trim: true,
        default: null
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    processedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    },
    processedAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

// Index for performance
joinRequestSchema.index({ communityId: 1, status: 1 });
joinRequestSchema.index({ userId: 1, status: 1 });
joinRequestSchema.index({ createdAt: -1 });

module.exports = mongoose.model("JoinRequest", joinRequestSchema);
