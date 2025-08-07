const mongoose = require("mongoose");

const experienceSchema = new mongoose.Schema({

    name:{
        type:String,
    },
    role:{
        type: String
    },
    startDate:{
        type:Date
    },
    endDate:{
        type:Date
    },
    desc:{
        type:String
    },
    current: {
        type: Boolean
    },
    createAt:{
        type:Date,
        default:Date.now()
    },
    updatedAt: {
        type:Date,
        default:Date.now()
    }

})

module.exports = mongoose.model("Experience", experienceSchema);

