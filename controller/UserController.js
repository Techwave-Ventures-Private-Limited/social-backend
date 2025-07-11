const User = require("../modules/user");
const Education = require("../modules/education");
const Experience = require("../modules/experience");
const About = require("../modules/about");
const mongoose = require("mongoose");

function parseDate(val) {
    if (!val || val === "Present") return undefined;
    const d = new Date(val);
    return isNaN(d.getTime()) ? undefined : d;
}

exports.getUser = async(req,res) => {
    try{
        const userId = req.userId;

        if(!userId) {
            return res.status(400).json({
                success:false,
                message:"Unauthorized request"
            })
        } 

        const user = await User.findById(userId)
            .populate({
                path: 'about',
                populate: [
                    { path: 'education' },
                    { path: 'experience' }
                ]
            })
            .populate('education')
            .populate('experience')
            .lean();

        if(!user) {
            return res.status(402).json({
                success:false,
                message:"User not found"
            })
        }

        return res.status(200).json({
            success:true,
            message:"User found",
            body: user
        })

    } catch(err) {
        return res.status(500).json({
            success: false,
            message: err.message
        })
    }
}

exports.updateUser = async(req,res) => {
    try{
        const userId = req.userId;
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success:false,
                message:`User does not exists with userId : ${userId}`
            })
        }

        const {
            name, bio, education = [], experience = [],
            skills = [], headline = "", location = "", phone = "", website = ""
        } = req.body;

        user.name = name || user.name;
        user.bio = bio || user.bio;

       
        let about = null;
        if (user.about) {
            about = await About.findById(user.about);
        }
        if (!about) {
            about = new About();
        }
        about.skills = skills;
        about.headline = headline;
        about.location = location;
        about.phone = phone;
        about.website = website;

        
        const educationIds = [];
        for (const edu of education) {
            let eduDoc;
            const startDate = parseDate(edu.startYear);
            const endDate = parseDate(edu.endYear);
            if (edu.id && mongoose.Types.ObjectId.isValid(edu.id)) {
                eduDoc = await Education.findByIdAndUpdate(
                    edu.id,
                    {
                        name: edu.institution,
                        school: edu.institution,
                        fos: edu.field,
                        degree: edu.degree,
                        startDate,
                        endDate
                    },
                    { new: true, upsert: true }
                );
            } else {
                eduDoc = await Education.create({
                    name: edu.institution,
                    school: edu.institution,
                    fos: edu.field,
                    degree: edu.degree,
                    startDate,
                    endDate
                });
            }
            educationIds.push(eduDoc._id);
        }
        about.education = educationIds;
        user.education = educationIds;

     
        const experienceIds = [];
        for (const exp of experience) {
            let expDoc;
            const startDate = parseDate(exp.startDate);
            const endDate = parseDate(exp.endDate);
            if (exp.id && mongoose.Types.ObjectId.isValid(exp.id)) {
                expDoc = await Experience.findByIdAndUpdate(
                    exp.id,
                    {
                        name: exp.company,
                        role: exp.position,
                        startDate,
                        endDate,
                        desc: exp.description
                    },
                    { new: true, upsert: true }
                );
            } else {
                expDoc = await Experience.create({
                    name: exp.company,
                    role: exp.position,
                    startDate,
                    endDate,
                    desc: exp.description
                });
            }
            experienceIds.push(expDoc._id);
        }
        about.experience = experienceIds;
        user.experience = experienceIds;

        await about.save();
        user.about = about._id;
        await user.save();

        return res.status(200).json({
            success: true,
            message:'User updated successfully',
            body: user
        })

    } catch(err) {
        return res.status(500).json({
            success: false,
            message: err.message
        })
    }
}


