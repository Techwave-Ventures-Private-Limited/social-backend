const  mongoose = require("mongoose");

const likeSchema  = new mongoose.Schema({

    userId : {
        type: String,
        required: true,
        index: true
    },
    postId : {
        type: String,
        required: true,
        index: true
    },
    createdAt : {
        type:Date,
        default: Date.now,
    },
})

likeSchema.index({ userId: 1, postId: 1 });

module.exports =  mongoose.model("Like", likeSchema);