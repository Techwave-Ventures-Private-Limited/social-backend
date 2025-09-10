const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    }],
    messages: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Message",
        default: [],
    }],
    lastMessage: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Message"
    },
    status: {
        type: String,
        enum: ['active', 'pending', 'blocked', 'rejected'],
        default: 'pending'
    },
    initiatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    rejectedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    },
    // NEW: Differentiate conversation type
    type: {
        type: String,
        enum: ['dm', 'group'],
        default: 'dm'
    },

    // NEW: Link to a community if it's a group chat
    communityId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Community',
        default: null
    },

    // NEW: Control who can send messages in a group chat
    messagingPermissions: {
        type: String,
        enum: ['members', 'admins_only'],
        default: 'members' // 'members' can chat by default
    },
}, { timestamps: true });

module.exports = mongoose.model("conversation", conversationSchema);
