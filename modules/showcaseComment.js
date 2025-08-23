const mongoose = require("mongoose");

const showcaseCommentSchema = new mongoose.Schema({

    text: {
        type:String,
        default:""
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    likes : {
        type:Number,
        default : 0
    },
    showcaseId : {
        type:String,
        required: true
    },
    replyTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ShowcaseComment',
        default: null
    },
    replies: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ShowcaseComment',
        default: []
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

module.exports = mongoose.model("ShowcaseComment", showcaseCommentSchema);

