const mongoose = require("mongoose");

const experienceSchema = new mongoose.Schema({

    name: {
        type: String,
    },
    role: {
        type: String
    },
    startDate: {
        type: Date
    },
    endDate: {
        type: Date
    },
    desc: {
        type: String
    },
    current: {
        type: Boolean
    },
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Company",
        default: null
    },
    workEmail: {
        type: String,
        trim: true,
        lowercase: true
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    createAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }

})

module.exports = mongoose.model("Experience", experienceSchema);

