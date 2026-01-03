const mongoose = require("mongoose");

const botStateSchema = new mongoose.Schema({
    botType: {
        type: String,
        enum: ["POST", "COMMENT", "LIKE"],
        unique: true
    },
    lastRunAt: {
        type: Date,
        default: null
    },
    lockedAt: {
        type: Date,
        default: null
    }
}, { timestamps: true });

module.exports = mongoose.model("BotState", botStateSchema);
