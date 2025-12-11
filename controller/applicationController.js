const Application = require("../modules/JobApplication");
const Job = require("../modules/job");
const User = require("../modules/user");
const { uploadResumeToS3 } = require("../utils/s3Upload"); // Import the helper

// 1. CANDIDATE: Apply for a Job
exports.applyForJob = async (req, res) => {
    try {
        const userId = req.userId;
        const {
            jobId,
            coverLetter,
            portfolioLink,
            screeningAnswers
        } = req.body;

        // 2. Handle Resume Upload (The new Logic)
        let resumeUrl = req.body.resume; // Fallback if they send a link manually

        if (req.file) {
            try {
                // Upload the buffer to S3
                resumeUrl = await uploadResumeToS3(req.file, userId);
            } catch (uploadError) {
                console.error("S3 Upload Error:", uploadError);
                return res.status(500).json({
                    success: false,
                    message: "Failed to upload resume. Please try again."
                });
            }
        }

        // A. Basic Validation
        if (!jobId || !resumeUrl) {
            return res.status(400).json({
                success: false,
                message: "Job ID and Resume (PDF or Link) are required"
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
        const initialStep = job.hiringWorkflow?.find(step => step.order === 1);
        const startStatus = initialStep ? initialStep.stepName : "Applied";

        // Handle Screening Answers parsing if sent as string via FormData
        let parsedScreeningAnswers = screeningAnswers;
        if (typeof screeningAnswers === 'string') {
            try {
                parsedScreeningAnswers = JSON.parse(screeningAnswers);
            } catch (e) {
                parsedScreeningAnswers = [];
            }
        }

        // D. Create the Application
        const newApplication = await Application.create({
            job: jobId,
            applicant: userId,
            company: job.company,
            resume: resumeUrl, // This is now the AWS S3 Link
            coverLetter,
            portfolioLink,
            screeningAnswers: parsedScreeningAnswers,
            status: startStatus,
            statusHistory: [{
                status: startStatus,
                note: "Application submitted via ConnektX",
                updatedBy: userId,
                changedAt: Date.now()
            }]
        });

        // E. Link Application to Job & User
        await Job.findByIdAndUpdate(jobId, { $push: { applications: newApplication._id } });
        await User.findByIdAndUpdate(userId, { $push: { applicationsSent: newApplication._id } });

        return res.status(201).json({
            success: true,
            message: "Application submitted successfully",
            data: newApplication
        });

    } catch (error) {
        console.error("Apply Error:", error);

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
        // NOTE: Ensure your auth middleware sets req.userId (camelCase)
        const recruiterId = req.userId;
        const { applicationId, status, note } = req.body;

        // 1. Find the Application and Populate the Job
        // We MUST populate 'job' to access the custom hiringWorkflow
        const application = await Application.findById(applicationId).populate('job');

        if (!application) {
            return res.status(404).json({
                success: false,
                message: "Application not found"
            });
        }

        // ---------------------------------------------------------
        // 🌟 2. DYNAMIC VALIDATION (The Core Change)
        // ---------------------------------------------------------
        // Instead of a hardcoded array, we check the specific Job's workflow.
        let validStages = application.job.hiringWorkflow.map(step => step.stepName);

        // Fallback for legacy jobs with no workflow defined
        if (validStages.length === 0) {
            validStages = ["Applied", "Viewed", "Shortlisted", "Selected", "Rejected"];
        }

        if (!validStages.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Invalid status. Allowed stages for this job are: ${validStages.join(", ")}`
            });
        }
        // ---------------------------------------------------------

        // 3. Update the Status
        application.status = status;

        // 4. Add to History (The Audit Trail)
        application.statusHistory.push({
            status: status,
            note: note || `Status updated to ${status}`,
            updatedBy: recruiterId,
            changedAt: Date.now()
        });

        // 5. Save the changes
        await application.save();

        // 6. Populate Applicant details for the Frontend UI return
        // (We do this after save so we get the fresh object)
        await application.populate("applicant", "name email profileImage headline");

        // Optional: Trigger Notification Logic Here
        // sendNotification(application.applicant._id, `Your application status changed to ${status}`);

        return res.status(200).json({
            success: true,
            message: `Candidate moved to ${status}`,
            data: application
        });

    } catch (error) {
        console.error("Update Status Error:", error);
        return res.status(500).json({
            success: false,
            message: "Error updating status"
        });
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
            .populate({
                path: "applicant",
                select: "name email headline profileImage resume portfolioLink experience education",
                populate: [
                    { path: "experience", select: "role name startDate endDate current desc" },
                    { path: "education", select: "school degree fos startDate endDate" }
                ]
            })
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
                select: "title description locations company hiringWorkflow",
                populate: { path: "company", select: "name logo domain" }
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