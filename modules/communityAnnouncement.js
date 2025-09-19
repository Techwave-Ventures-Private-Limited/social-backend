const mongoose = require("mongoose");

const communityAnnouncementSchema = new mongoose.Schema({
    communityId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Community",
        required: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    content: {
        type: String,
        required: true,
        trim: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
    },
    expiresAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

// Index for performance
communityAnnouncementSchema.index({ communityId: 1, createdAt: -1 });
communityAnnouncementSchema.index({ isActive: 1, priority: 1 });

module.exports = mongoose.model("CommunityAnnouncement", communityAnnouncementSchema);
