const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({

    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
    },
    otp: {
        type: String,
    },
    emailVerityToken: {
        type: String,
    },
    isVerified: {
        type: Boolean,
        default: false,
    },
    token: {
        type: String,
        default: ""
    },
    password: {
        type: String,
        required: true
    },
    bio: {
        type: String,
        default: ""
    },
    headline: {
        type: String,
        default: ""
    },
    address: {
        type: String,
        default: ""
    },
    posts: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Post",
        default: []
    }],
    event: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Event",
        default: []
    }],
    savedPost: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Post",
        default: []
    }],
    likedPost: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Post",
        default: []
    }],
    followers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: []
    }],
    following: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: [] //show their stories
    }],
    applicationsSent: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Application"
    }],
    about: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "About"
    },
    profileImage: {
        type: String,
        default: null
    },
    bannerImage: {
        type: String,
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    education: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Education",
        default: []
    }],
    experience: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Experience",
        default: []
    }],
    stories: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Story",
        default: []
    }],
    savedNews: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "news-article",
        default: []
    }],
    likedNews: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "news-article",
        default: []
    }],
    streak: {
        type: Number,
        default: 0
    },
    lastStreakUpdate: {
        type: Date,
        default: null
    },
    portfolio: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Portfolio"
    }],
    deviceTokens: [{
        type: String,
    }],
    likedComments: [{
        type: String,
        default: []
    }],
    communities: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Community",
        default: []
    }],
    type: {
        type: String,
        enum: ["User", "Company"],
        default: "User"
    },
    website: {
        type: String,
    },
    companyDetails: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "CompanyDetails"
    },
    followingCount: {
        type: Number,
        default: 0
    },
    followerCount: {
        type: Number,
        default: 0
    },
    ib: {
        type: Boolean,
        deafult: false
    },
    bt: {
        type: String,
    },
    bk: {
        type: String
    },
    category: {
        type: String,
        enum: ["Business & Entrepreneurship",
            "Technology & IT",
            "Design & Creative",
            "Sales, Marketing & Growth",
            "Product, Strategy & Operations",
            "Finance, Legal & HR",
            "Law & Compliance",
            "Industry & Trade",
            "Retail & Services",
            "Education & Training",
            "Healthcare & Wellness",
            "Media, Content & Creators",
            "Real Estate & Infrastructure",
            "Freelance & Independent",
            "Students & Early Career",
            "Government / Public Sector"],
        default: "Technology & IT"
    }
})

module.exports = mongoose.model("User", userSchema);

