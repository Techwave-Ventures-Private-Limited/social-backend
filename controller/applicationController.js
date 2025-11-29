const Application = require("../modules/JobApplication");
const Job = require("../modules/job");
const User = require("../modules/user");


// 1. CANDIDATE: Apply for a Job
exports.applyForJob = async (req, res) => {
    try {
        const userId = req.userId;
        const { 
            jobId, 
            resume, 
            coverLetter, 
            portfolioLink, 
            screeningAnswers 
        } = req.body;

        // A. Basic Validation
        if (!jobId || !resume) {
            return res.status(400).json({ 
                success: false, 
                message: "Job ID and Resume are required" 
            });
        }

        // B. Check if Job exists and is Accepting Applications
        const job = await Job.findById(jobId);
        
        if (!job || !job.isActive) {
            return res.status(404).json({ 
                success: false, 
                message: "Job not found or no longer accepting applications." 
            });
        }

        // 🌟 NEW CHECK: Handle External Applications
        // If the job is "External", we shouldn't be accepting data here.
        if (job.applyMethod === 'External') {
            return res.status(400).json({
                success: false,
                message: "This job requires applying via an external website.",
                externalLink: job.externalApplyLink
            });
        }

        // C. Check for Duplicate Application
        const existingApplication = await Application.findOne({ job: jobId, applicant: userId });
        if (existingApplication) {
            return res.status(400).json({ 
                success: false, 
                message: "You have already applied for this job." 
            });
        }

        // 🌟 DETERMINE STARTING STATUS
        // Find the step with order: 1 from the job's workflow. 
        // Fallback to "Applied" just in case something is wrong with the data.
        const initialStep = job.hiringWorkflow.find(step => step.order === 1);
        const startStatus = initialStep ? initialStep.stepName : "Applied";

        // D. Create the Application
        const newApplication = await Application.create({
            job: jobId,
            applicant: userId,
            company: job.company, // Denormalize company ID for faster lookups
            resume,
            coverLetter,
            portfolioLink,
            screeningAnswers, // Array of { question, answer }
            
            // 🌟 Use the Dynamic Status
            status: startStatus,

            // E. Initialize Traceability
            statusHistory: [{
                status: startStatus,
                note: "Application submitted via ConnektX",
                updatedBy: userId,
                changedAt: Date.now()
            }]
        });

        // F. Link Application to Job & User
        // Using $push is correct here
        await Job.findByIdAndUpdate(jobId, { $push: { applications: newApplication._id } });
        await User.findByIdAndUpdate(userId, { $push: { applicationsSent: newApplication._id } });

        // TODO: Trigger Notification to Recruiter (Email/Socket) here

        return res.status(201).json({
            success: true,
            message: "Application submitted successfully",
            data: newApplication
        });

    } catch (error) {
        console.error("Apply Error:", error);
        
        // Handle Duplicate Key Error (E11000) just in case race condition happened
        if (error.code === 11000) {
            return res.status(400).json({ 
                success: false, 
                message: "You have already applied for this job." 
            });
        }
        
        return res.status(500).json({ 
            success: false, 
            message: "Error submitting application" 
        });
    }
};


// 2. RECRUITER: Update Application Status (Traceability)
exports.updateApplicationStatus = async (req, res) => {
    try {
        const recruiterId = req.userid;
        const { applicationId, status, note } = req.body;

        // A. Validate Status Enum
        const validStatuses = ["Applied", "Reviewing", "Shortlisted", "Interview", "Assessment", "Offer", "Rejected", "Withdrawn"];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: "Invalid status value" });
        }

        // B. Find and Update (Pushing to History)
        const application = await Application.findByIdAndUpdate(
            applicationId,
            {
                status: status, // Update the "Current" status for filtering
                $push: {        // Add event to timeline
                    statusHistory: {
                        status: status,
                        note: note || `Status updated to ${status}`,
                        updatedBy: recruiterId,
                        changedAt: Date.now()
                    }
                }
            },
            { new: true } // Return updated doc
        )
        .populate("applicant", "name email profileImage headline"); // Return applicant info for UI update

        if (!application) {
            return res.status(404).json({ success: false, message: "Application not found" });
        }

        // Optional: Send Email Notification to Candidate here logic
        
        return res.status(200).json({
            success: true,
            message: `Candidate moved to ${status}`,
            data: application
        });

    } catch (error) {
        console.error("Update Status Error:", error);
        return res.status(500).json({ success: false, message: "Error updating status" });
    }
};


// 3. CANDIDATE: Get My Applications
exports.getMyApplications = async (req, res) => {
    try {
        const userId = req.userid;
        
        const applications = await Application.find({ applicant: userId })
            .populate({
                path: "job",
                select: "title location locationType salaryRange experienceLevel",
                populate: {
                    path: "company",
                    select: "name logo domain isVerified"
                }
            })
            .sort({ createdAt: -1 }); // Newest first

        return res.status(200).json({
            success: true,
            count: applications.length,
            data: applications
        });

    } catch (error) {
        return res.status(500).json({ success: false, message: "Error fetching your applications" });
    }
};


// 4. RECRUITER: Get Applications for a Job (Dashboard)
exports.getJobApplications = async (req, res) => {
    try {
        const { jobId } = req.params;
        const { status } = req.query; // Filter by status (e.g., ?status=Interview)

        // Build Filter
        let filter = { job: jobId };
        if (status) {
            filter.status = status;
        }

        // Verify the logged-in user owns this job (Optional Security Check)
        // const job = await Job.findById(jobId);
        // if (job.postedBy.toString() !== req.userid) return res.status(403)...

        const applications = await Application.find(filter)
            .populate("applicant", "name email headline profileImage resume portfolioLink")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: applications.length,
            data: applications
        });

    } catch (error) {
        return res.status(500).json({ success: false, message: "Error fetching candidates" });
    }
};


// 5. SHARED: Get Single Application Details (Traceability View)
exports.getApplicationById = async (req, res) => {
    try {
        const { id } = req.params;

        const application = await Application.findById(id)
            .populate({
                path: "job",
                select: "title description locations company",
                populate: { path: "company", select: "name logo" }
            })
            .populate("applicant", "name email profileImage headline")
            .populate("statusHistory.updatedBy", "name"); // Show who made the update

        if (!application) {
            return res.status(404).json({ success: false, message: "Application not found" });
        }

        return res.status(200).json({
            success: true,
            data: application
        });

    } catch (error) {
        return res.status(500).json({ success: false, message: "Error fetching application details" });
    }
};