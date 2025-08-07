const mongoose = require("mongoose");

const storySchema = new mongoose.Schema({
    url: {
        type:String,
        required: true
    },
    type: {
        type: String,
        required: true
    },
    userId: {
        type: String,
        ref: "User",
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 60 * 60 * 24 * 1,
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
})

module.exports = mongoose.model("Story", storySchema);

