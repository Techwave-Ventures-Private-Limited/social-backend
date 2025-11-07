const  mongoose = require("mongoose");

const connectionSchema  = new mongoose.Schema({

    follower: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        index: true
    },
    following: {
        type : mongoose.Schema.Types.ObjectId,
        required: true,
        index: true
    },
    createdAt : {
        type:Date,
        default: Date.now,
    },
})

connectionSchema.index({ follower: 1, following: 1 });

module.exports =  mongoose.model("Connectino", connectionSchema);