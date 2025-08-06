const mongoose = require("mongoose");

const portfolioSchema = new mongoose.Schema({
    logo: {
        type: String,
    },
    link: {
        type: String,
    },
    desc: {
        type: String
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    title: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }

});

module.exports = mongoose.model("Portfolio", portfolioSchema);