const mongoose = require("mongoose");

const communitySettingsSchema = new mongoose.Schema({
    allowMemberPosts: {
        type: Boolean,
        default: true
    },
    allowMemberEvents: {
        type: Boolean,
        default: true
    },
    autoApproveJoins: {
        type: Boolean,
        default: true
    },
    allowExternalSharing: {
        type: Boolean,
        default: true
    },
    moderationLevel: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
    },
    welcomeMessage: {
        type: String,
        default: ''
    }
});

const communitySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    description: {
        type: String,
        required: true
    },
    coverImage: {
        type: String,
        default: null
    },
    logo: {
        type: String,
        default: null
    },
    tags: [{
        type: String,
        trim: true
    }],
    location: {
        type: String,
        default: null
    },
    memberCount: {
        type: Number,
        default: 1
    },
    members: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],
    admins: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],
    moderators: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    groupChatId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Conversation',
        default: null
    },
    isPrivate: {
        type: Boolean,
        default: false
    },
    requiresApproval: {
        type: Boolean,
        default: false
    },
    lastActivity: {
        type: Date,
        default: Date.now
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    posts: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "CommunityPost"
    }],
    events: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event'
    }],
    resources: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "CommunityResource"
    }],
    announcements: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "CommunityAnnouncement"
    }],
    joinRequests: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "JoinRequest"
    }],
    bannedUsers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],
    settings: {
        type: communitySettingsSchema,
        default: () => ({})
    },
    category: {
        type: String,
        enum: [
        "technology_it",
        "healthcare_medicine",
        "business_entrepreneurship",
        "finance_accounting",
        "law_policy",
        "education_research",
        "engineering_manufacturing",
        "marketing_media",
        "arts_design",
        "sports_fitness",
        "environment_sustainability",
        "publicservice_nonprofits",
        ],
    },
}, {
    timestamps: true
});

// Index for search and performance
communitySchema.index({ name: 'text', description: 'text', tags: 'text' });
communitySchema.index({ isPrivate: 1, members: 1 });
communitySchema.index({ lastActivity: -1 });

module.exports = mongoose.model("Community", communitySchema);
