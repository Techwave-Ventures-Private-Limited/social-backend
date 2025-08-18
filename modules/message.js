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
    readBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    }]
}, { timestamps: true });

module.exports = mongoose.model("Message", messageSchema);
