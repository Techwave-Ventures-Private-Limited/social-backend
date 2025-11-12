const mongoose = require("mongoose");

const showcaseSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true
    },
    logo: {
        type: String,
        required: true
    },
    images: [{
        type: String
    }],
    bannerImageUrl: {
        type: String
    },
    category: {
        type: String,
        enum: ['App', 'Idea', 'Design', 'Article'],
    },
    projectTitle: {
        type: String,
    },
    tagline: {
        type: String,
    },
    description: {
        type: String
    },
    problem: {
        type: String
    },
    solution: {
        type: String
    },
    revenueModel: {
        type: String
    },
    demoVideoLink: {
        type: String
    },
    tags: [{
        type: String
    }],
    projectLinks: [{
        type: String
    }],
    upvotes: {
        type: Number,
        default: 0
    },
    upvotesUsers: [{
        type: String,
    }],
    comments:[{
            type: mongoose.Schema.Types.ObjectId,
            ref: "ShowcaseComment",
            default : ""
    }],
    opportunities: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Opportunity"
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
})

module.exports = mongoose.model("Showcase", showcaseSchema);