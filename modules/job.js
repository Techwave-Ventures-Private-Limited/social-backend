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
        enum: ["Full-time", "Part-time", "Contract", "Temporary", "Volunteer", "Internship", "Freelance", "Other"],
        required: true
    },
    // NEW: Seniority Level (Crucial for filtering)
    experienceLevel: {
        type: String,
        enum: ["Fresher", "Entry Level (1-2 years)", "Mid Level (3-5 years)", "Senior level (5+ years)"],
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
    // NEW: Customizable Hiring Workflow
    hiringWorkflow: [{
        stepName: { 
            type: String, 
            required: true,
            trim: true 
        },
        stepType: {
            type: String,
            enum: ["System", "Custom"], // System = Applied, Rejected. Custom = Technical Round, etc.
            default: "Custom"
        },
        order: { 
            type: Number, 
            required: true 
        },
        description: String // e.g., "Complete the HackerRank link sent to email"
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

// Helper to initialize default stages for every new job
jobSchema.pre('save', function(next) {
    if (this.isNew && this.hiringWorkflow.length === 0) {
        this.hiringWorkflow = [
            { stepName: "Applied", stepType: "System", order: 1 },
            { stepName: "Viewed", stepType: "System", order: 2 },
            { stepName: "Shortlisted", stepType: "System", order: 3 },
            { stepName: "Selected", stepType: "System", order: 99 }, // High number to keep at end
            { stepName: "Rejected", stepType: "System", order: 100 }
        ];
    }
    next();
});

// Indexing for fast search
jobSchema.index({ title: "text", skills: "text" }); 

module.exports = mongoose.model("Job", jobSchema);