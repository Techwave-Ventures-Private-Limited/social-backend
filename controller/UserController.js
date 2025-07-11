const User = require("../modules/user");
const Education = require("../modules/education");
const Experience = require("../modules/experience");
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
            name, headline, bio, location, email, phone, website,
            education = [], experience = [], skills = []
        } = req.body;

        
        user.name = name || user.name;
        user.headline = headline || user.headline;
        user.bio = bio || user.bio;
        user.location = location || user.location;
        user.email = email || user.email;
        user.phone = phone || user.phone;
        user.website = website || user.website;
        user.skills = skills || user.skills;

        // Handle education
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
        user.education = educationIds;

        // Handle experience
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
        user.experience = experienceIds;

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


