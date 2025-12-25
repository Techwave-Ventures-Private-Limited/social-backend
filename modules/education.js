const mongoose = require("mongoose");

const educationSchema = new mongoose.Schema({

    name: {
        type: String
    },
    school: {
        type: String
    },
    fos: {
        type: String
    },
    degree: {
        type: String,

    },
    startDate: {
        type: Date
    },
    endDate: {
        type: Date
    },
    current: {
        type: Boolean
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

module.exports = mongoose.model("Education", educationSchema);

