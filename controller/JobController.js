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