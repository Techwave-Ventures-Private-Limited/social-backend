const mongoose = require("mongoose");

const newsSchema = new mongoose.Schema({
    headline : {
        type : String
    },
    bannerImage: {
        type: String
    },
    article: {
        type: String
    },
    ref: {
        type: String
    },
    category: [{
        type: String
    }],
    timestamp: {
        type: String
    },
    likes: {
        type: Number,
        default: 0
    }
});

module.exports = mongoose.model("news-article", newsSchema)