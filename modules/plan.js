const mongoose = require("mongoose");

const planSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true,
            index: true
        },
        description: {
            type: String,
            default: "",
        },
        price: {
            type: Number,
            required: true,
        },
        currency: {
            type: String,
            default: "INR",
        },
        durationInDays: {
            type: Number,
            required: true,
        },
        features: [
            {
                key: String,
                value: mongoose.Schema.Types.Mixed,
            },
        ],
        isActive: {
            type: Boolean,
            default: true,
        },
        isRecurring: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Plan", planSchema);
