const mongoose = require("mongoose");

const applicationSchema = new mongoose.Schema({
    // Link to the opportunity
    opportunityId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Opportunity",
        required: true,
        index: true
    },
    // Link to the user who is applying
    applicantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    // Link to the project owner (for easy notification)
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    // Optional: A quick message from the applicant
    message: {
        type: String,
        trim: true
    },
    // Status of this specific application
    status: {
        type: String,
        enum: ['Pending', 'Viewed', 'Accepted', 'Rejected'],
        default: 'Pending'
    }
}, {
    timestamps: true // Adds createdAt and updatedAt automatically
});

/**
 * To make this scalable, we'll create a compound index.
 * This prevents a user from applying to the same opportunity multiple times.
 */
applicationSchema.index({ opportunityId: 1, applicantId: 1 }, { unique: true });


/**
 * POST-SAVE HOOK:
 * This is a powerful trick for scalability.
 * After a new Application is saved, it automatically increments the
 * 'applicationCount' on the parent Opportunity.
 */
applicationSchema.post('save', async function(doc) {
    try {
        // 'doc' is the application that was just saved
        await mongoose.model('Opportunity').findByIdAndUpdate(doc.opportunityId, {
            $inc: { applicationCount: 1 }
        });
    } catch (error) {
        console.error("Error incrementing applicationCount: ", error);
    }
});

/**
 * POST-REMOVE HOOK:
 * If an applicant withdraws their application (document is deleted),
 * we decrement the count.
 */
applicationSchema.post('remove', async function(doc) {
    try {
        await mongoose.model('Opportunity').findByIdAndUpdate(doc.opportunityId, {
            $inc: { applicationCount: -1 }
        });
    } catch (error) {
        console.error("Error decrementing applicationCount: ", error);
    }
});


module.exports = mongoose.model("Application", applicationSchema);