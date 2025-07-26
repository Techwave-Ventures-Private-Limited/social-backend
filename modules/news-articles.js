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
    }
});

module.exports = mongoose.model("news-article", newsSchema)