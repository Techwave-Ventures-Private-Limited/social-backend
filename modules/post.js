const mongoose = require("mongoose");

const postSchema = new mongoose.Schema({

    discription:{
        type: String,
    },
    media:[{
        type : String
    }],
    postType:{
        type: String,
        enum: ['public', 'private'],
        required: true
    },
    likes:{
        type: Number,
        default: 0
    },
    comments:[{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Comment",
        default : ""
    }],
    userId : {
        type: String
    },
    createdAt:{
        type:Date,
        default:Date.now
    },
    updatedAt: {
        type:Date,
        default:Date.now
    }

})

module.exports = mongoose.model("Post", postSchema);

