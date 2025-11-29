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
        const validStages = application.job.hiringWorkflow.map(step => step.stepName);
        
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