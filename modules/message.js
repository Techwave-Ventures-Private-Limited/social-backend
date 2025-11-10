// module/message.js
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    conversationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Conversation",
        required: true,
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    content: {
        type: String,
        trim: true,
    },
    sharedPost: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Post",
    },
    sharedNews: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "news-article",
    },
    // New fields to handle sharing user profiles and showcases
    sharedUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
    sharedShowcase: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Showcase",
    },
    replyTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Message",
        default: null
    },
    // Updated to store seen timestamps for each user
    readBy: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        seenAt: {
            type: Date,
            default: Date.now
        }
    }]
}, { timestamps: true }); // `createdAt` acts as the sent timestamp

module.exports = mongoose.model("Message", messageSchema);
