const mongoose = require("mongoose");

const opportunitySchema = new mongoose.Schema({
    // Link to the project this opportunity is for
    showcaseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Showcase",
        required: true,
        index: true // Index for fast queries
    },
    // Link to the user who posted it (the project owner)
    postedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    // The "role" they are looking for
    title: {
        type: String,
        required: true,
        trim: true
    },
    // The "what they need" part
    description: {
        type: String,
        required: true
    },
    // Good for filtering (e.g., "Engineering", "Design", "Marketing")
    category: {
        type: String,
        required: true,
        enum: ['Engineering', 'Design', 'Marketing', 'Business', 'Other']
    },
    // Specific skills for better matching
    skills: [{
        type: String,
        trim: true
    }],
    // 'Open' means you are still looking, 'Closed' means the role is filled
    status: {
        type: String,
        enum: ['Open', 'Closed'],
        default: 'Open'
    },
    // This is a "denormalized" count for scalability.
    // It's much faster to read this than to count applications every time.
    applicationCount: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true // Adds createdAt and updatedAt automatically
});

module.exports = mongoose.model("Opportunity", opportunitySchema);