const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    // CHANGED: Array of strings to support ["Pune", "Bangalore", "Noida"]
    locations: [{
        type: String,
        required: true 
    }],
    // "Remote", "On-site", "Hybrid" applies to these locations
    locationType: {
        type: String,
        enum: ["On-site", "Remote", "Hybrid"],
        required: true,
        default: "On-site"
    },
    // NEW: Number of positions available
    openings: {
        type: Number,
        default: 1
    },
    type: {
        type: String,
        enum: ["Full-time", "Part-time", "Contract", "Internship", "Freelance"],
        required: true
    },
    // NEW: Seniority Level (Crucial for filtering)
    experienceLevel: {
        type: String,
        enum: ["Intern", "Entry Level", "Mid-Senior", "Senior", "Associate", "Director", "Executive"],
        required: true
    },
    salaryRange: {
        min: { type: Number },
        max: { type: Number },
        currency: { type: String, default: "INR" },
        isDisclosed: { type: Boolean, default: true }, // Option to hide salary
        // NEW: whether the salary is yearly CTC or monthly
        period: {
            type: String,
            enum: ["Yearly", "Monthly"],
            default: "Yearly"
        }
    },
    // NEW: Skills tags for search (e.g., ["React", "Node.js", "AWS"])
    skills: [{
        type: String,
        lowercase: true,
        trim: true
    }],
    requirements: [{
        type: String
    }],
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Company",
        required: true
    },
    postedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    // NEW: Application Method
    applyMethod: {
        type: String,
        enum: ["EasyApply", "External"],
        default: "EasyApply"
    },
    externalApplyLink: {
        type: String,
        validate: {
            validator: function(v) {
                // If applyMethod is External, this field is required (return false if empty)
                if (this.applyMethod === 'External') {
                    return v && v.length > 0; 
                }
                return true; // Otherwise, it's optional
            },
            message: 'External apply link is required when application method is External.'
        }
    },
    isActive: {
        type: Boolean,
        default: true
    },
    expiresAt: {
        type: Date,
        // Auto-expire job after 30 days by default
        default: () => new Date(+new Date() + 30*24*60*60*1000) 
    },
    applications: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "JobApplication"
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Indexing for fast search
jobSchema.index({ title: "text", skills: "text" }); 

module.exports = mongoose.model("Job", jobSchema);