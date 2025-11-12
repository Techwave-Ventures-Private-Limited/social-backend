const Opportunity = require("../modules/opportunity");
const Application = require("../modules/application");
const { createNotification } = require('../utils/notificationUtils');

/**
 * Creates a new application for an opportunity.
 */
exports.applyToOpportunity = async (req, res) => {
    try {
        const { opportunityId } = req.params;
        const { message } = req.body; // Optional message from the applicant
        const applicantId = req.userId; // From auth middleware

        // 1. Find the opportunity
        const opportunity = await Opportunity.findById(opportunityId);
        if (!opportunity) {
            return res.status(404).json({
                success: false,
                message: "Opportunity not found"
            });
        }

        // 2. Check rules
        if (opportunity.status === 'Closed') {
            return res.status(400).json({
                success: false,
                message: "This opportunity is closed"
            });
        }

        if (opportunity.postedBy.toString() === applicantId) {
            return res.status(400).json({
                success: false,
                message: "You cannot apply to your own opportunity"
            });
        }

        // 3. Check if already applied (handled by database index, but good to check)
        const existingApplication = await Application.findOne({
            opportunityId: opportunityId,
            applicantId: applicantId
        });

        if (existingApplication) {
            return res.status(400).json({
                success: false,
                message: "You have already applied to this opportunity"
            });
        }

        // 4. Create the application
        const newApplication = await Application.create({
            opportunityId: opportunityId,
            applicantId: applicantId,
            ownerId: opportunity.postedBy, // We store this for easy notification
            message: message || ""
        });

        // 5. Send notification to the project owner
        // (The 'post' save hook on the Application model will update the count)
        await createNotification(
            opportunity.postedBy, // Notify the owner
            applicantId,          // From the applicant
            'application',        // Type of notification
            opportunityId         // Link to the opportunity
        );

        return res.status(201).json({
            success: true,
            message: "Application submitted successfully",
            body: newApplication
        });

    } catch (err) {
        // Handle the 'duplicate key' error if the unique index is violated
        if (err.code === 11000) {
            return res.status(400).json({
                success: false,
                message: "You have already applied."
            });
        }
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
}

// (You can add other controllers here later, e.g., getApplicants, closeOpportunity)