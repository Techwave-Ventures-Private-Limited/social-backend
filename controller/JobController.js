// controller/JobController.js
const Job = require("../modules/job");
const Experience = require("../modules/experience");


exports.createJob = async (req, res) => {
    try {
        const userId = req.userId;

        const { 
            title, 
            description, 
            locations,
            locationType, 
            openings,
            type, 
            experienceLevel,
            salaryRange, 
            skills,
            requirements,
            experienceId, 
            applyMethod,
            externalApplyLink
        } = req.body;

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

        // 3. Create the Job
        const newJob = await Job.create({
            title,
            description,
            locations,       // Mongoose handles the array automatically
            locationType,
            openings,
            type,
            experienceLevel,
            salaryRange,
            skills,
            requirements,
            company: experience.companyId, // Auto-linked
            postedBy: userId,
            applyMethod,
            externalApplyLink: applyMethod === "External" ? externalApplyLink : undefined
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
            message: error.message // This will catch the Mongoose validator error we added above
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
                select: "_id" 
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
    }   catch (error) {         
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Error fetching user's jobs"
        });
    }
};
