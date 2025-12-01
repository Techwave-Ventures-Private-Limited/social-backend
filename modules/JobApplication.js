const mongoose = require("mongoose");

const jobApplicationSchema = new mongoose.Schema({
    // 1. Core Relationships
    job: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Job",
        required: true,
        index: true // Faster lookups for "Who applied to Job X?"
    },
    applicant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true // Faster lookups for "My Applications"
    },
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Company",
        required: true
    },

    // 2. Traceability (The Status Pipeline)
    status: {
        type: String,
        default: "Applied",
        index: true
    },

    // 🌟 UPDATED: Traceability still works the same
    statusHistory: [{
        status: String, // The step name
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        note: String,
        changedAt: { type: Date, default: Date.now }
    }],

    // 3. Application Data
    resume: {
        type: String, // URL to PDF (S3/Cloudinary)
        required: true
    },
    coverLetter: {
        type: String,
        trim: true
    },
    portfolioLink: {
        type: String
    },
    
    // 4. Screening Logic (Matches the Job's 'screeningQuestions')
    screeningAnswers: [{
        question: String, // The question text snapshot
        answer: String    // The user's answer
    }],

    // 5. Meta Data
    isArchived: {
        type: Boolean,
        default: false // For recruiters to hide rejected apps without deleting
    }
}, { 
    timestamps: true // Automatically manages createdAt and updatedAt
});

// 1. Prevent Duplicate Applications
// A user cannot apply to the same Job twice.
jobApplicationSchema.index({ job: 1, applicant: 1 }, { unique: true });

// 2. Faster Status Filtering
// "Show me all candidates in 'Interview' stage"
jobApplicationSchema.index({ job: 1, status: 1 });

module.exports = mongoose.model("JobApplication", jobApplicationSchema);