const mongoose = require("mongoose");

const aboutSchema = new mongoose.Schema({

    summary:{
        type:String,
        default: ""
    },
    experience: [{
        type: mongoose.Schema.Types.ObjectId,
        ref : "Experience",
        default : []
    }],
    education: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Education",
        default : []
    }],
    skills: [{
        type: String,
        default : []
    }],
    createAt:{
        type:Date,
        default:Date.now()
    },
    updatedAt: {
        type:Date,
        default:Date.now()
    }

})

module.exports = mongoose.model("About", aboutSchema);

