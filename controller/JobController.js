// controller/JobController.js
const Job = require("../modules/job");
const Experience = require("../modules/experience");


exports.createJob = async (req, res) => {
    try {
        const userId = req.userId;

        const { title, description, locations, locationType, openings, type, experienceLevel, salaryRange,
            skills, requirements, experienceId, applyMethod, externalApplyLink, customStages
        } = req.body;

        // Normalise salaryRange so we always have a clean object
        const normalisedSalaryRange = salaryRange ? {
            min: typeof salaryRange.min === 'number' ? salaryRange.min : Number(salaryRange.min) || undefined,
            max: typeof salaryRange.max === 'number' ? salaryRange.max : Number(salaryRange.max) || undefined,
            currency: salaryRange.currency || "INR",
            isDisclosed: typeof salaryRange.isDisclosed === 'boolean'
                ? salaryRange.isDisclosed
                : salaryRange.isDisclosed !== undefined
                    ? Boolean(salaryRange.isDisclosed)
                    : true,
            period: salaryRange.period === 'Monthly' ? 'Monthly' : 'Yearly',
        } : undefined;

        // 1. Validation
        if (!title || !description || !experienceId || !locations || locations.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Title, Description, Location, and Verified Experience are required"
            });
        }

        // 2. Security Check: Verify the Experience
        const experience = await Experience.findById(experienceId);

        if (!experience || !experience.isVerified) {
            return res.status(403).json({
                success: false,
                message: "You must select a verified experience/company to post a job."
            });
        }

        // 🌟 3. Construct the Dynamic Hiring Workflow
        let hiringWorkflow = [];

        // Step A: The Immutable Starting Point
        hiringWorkflow.push(
            { stepName: "Applied", stepType: "System", order: 1, description: "Application submitted" },
            { stepName: "Viewed", stepType: "System", order: 2, description: "Application viewed by recruiter" },
            { stepName: "Shortlisted", stepType: "System", order: 3, description: "Candidate shortlisted" },
        );

        // Step B: The Middle (Custom or Default)
        if (customStages && Array.isArray(customStages) && customStages.length > 0) {
            // Option 1: User provided custom stages
            // customStages example: [{ name: "Assessment" }, { name: "Interview 1" }]

            customStages.forEach((stage, index) => {
                hiringWorkflow.push({
                    stepName: stage.name,
                    stepType: "Custom",
                    // Start ordering from 2 (Applied is 1)
                    order: index + 4,
                    description: stage.description || ""
                });
            });

        } else {
            // Option 2: Default "Happy Path" if no custom stages provided
            const defaultStages = ["Interview"];

            defaultStages.forEach((name, index) => {
                hiringWorkflow.push({
                    stepName: name,
                    stepType: "System",
                    order: index + 4,
                    description: "Standard process"
                });
            });
        }

        // Step C: The Immutable End States (To ensure closure)
        // We use high order numbers to ensure they are always at the end
        hiringWorkflow.push(
            { stepName: "Selected", stepType: "System", order: 99, description: "Candidate hired" },
            { stepName: "Rejected", stepType: "System", order: 100, description: "Application rejected" }
        );

        // 4. Create the Job
        const newJob = await Job.create({
            title,
            description,
            locations,
            locationType,
            openings,
            type,
            experienceLevel,
            salaryRange: normalisedSalaryRange,
            skills,
            requirements,
            company: experience.companyId,
            postedBy: userId,
            applyMethod,
            externalApplyLink: applyMethod === "External" ? externalApplyLink : undefined,
            hiringWorkflow: hiringWorkflow
        });

        return res.status(201).json({
            success: true,
            message: "Job posted successfully",
            data: newJob
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get All Jobs with Advanced Filtering and Pagination
exports.getAllJobs = async (req, res) => {
    try {
        // 1. Destructure Query Parameters
        const {
            keyword,
            location,
            locationType,
            level,      // Experience Level (Intern, Senior, etc.)
            type,       // Job Type (Full-time, Contract)
            salaryMin,
            page = 1,
            limit = 10
        } = req.query;

        // 2. Build the Query Object
        // Default: Only show active jobs that haven't expired
        const query = {
            isActive: true,
            expiresAt: { $gt: new Date() } // Ensure job hasn't expired
        };

        // A. Keyword Search (Title, Description, or Skills)
        if (keyword) {
            const regex = new RegExp(keyword, "i"); // Case-insensitive
            query.$or = [
                { title: regex },
                { description: regex },
                { skills: { $in: [regex] } } // Checks if any skill matches the keyword
            ];
        }

        // B. Location Search (Matches any city in the 'locations' array)
        if (location) {
            query.locations = { $regex: location, $options: "i" };
        }

        // C. Specific Filters
        if (locationType) {
            query.locationType = locationType; // "Remote", "On-site", "Hybrid"
        }

        if (level) {
            query.experienceLevel = level; // "Senior", "Entry Level"
        }

        if (type) {
            query.type = type; // "Full-time", "Part-time"
        }

        // D. Salary Filter (Jobs paying AT LEAST this amount)
        if (salaryMin) {
            // Check if the job's MAX budget covers the user's requirement
            query["salaryRange.max"] = { $gte: Number(salaryMin) };
        }

        // 3. Pagination Logic
        const skip = (page - 1) * limit;

        // 4. Execute Query
        const jobs = await Job.find(query)
            .populate("company", "name logo domain isVerified") // Fetch essential company details
            .populate("postedBy", "name headline profileImage") // Fetch recruiter details
            .sort({ createdAt: -1 }) // Newest first
            .skip(skip)
            .limit(Number(limit));

        // 5. Get Total Count (for frontend pagination)
        const totalJobs = await Job.countDocuments(query);

        return res.status(200).json({
            success: true,
            count: jobs.length,
            total: totalJobs,
            currentPage: Number(page),
            totalPages: Math.ceil(totalJobs / limit),
            data: jobs
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Error fetching jobs"
        });
    }
};

// Get Job by ID with detailed info
exports.getJobById = async (req, res) => {
    try {
        const { id } = req.params;

        const job = await Job.findById(id)
            .populate("company", "name logo domain website about isVerified") // Full company info
            .populate("postedBy", "name headline profileImage email") // Recruiter info
            .populate({
                path: "applications", // Optional: Only if you want to show how many applied
                select: "_id applicant"
            });

        if (!job) {
            return res.status(404).json({
                success: false,
                message: "Job not found"
            });
        }

        // Optional: Logic to check if the job is expired? 
        // You might still want to show it but with a "Closed" badge.

        return res.status(200).json({
            success: true,
            data: {
                ...job.toObject(),
                applicantCount: job.applications ? job.applications.length : 0 // Useful metric
            }
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Error fetching job details"
        });
    }
};


// Get Jobs by User ID
exports.jobsByUserId = async (req, res) => {
    try {
        const { userId } = req.params;
        const jobs = await Job.find({ postedBy: userId })
            .populate("company", "name logo domain isVerified")
            .sort({ createdAt: -1 });
        return res.status(200).json({
            success: true,
            count: jobs.length,
            data: jobs
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Error fetching user's jobs"
        });
    }
};
