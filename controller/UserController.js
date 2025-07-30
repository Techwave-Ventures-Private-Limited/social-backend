const User = require("../modules/user");
const Education = require("../modules/education");
const Experience = require("../modules/experience");
const About = require("../modules/about");
const mongoose = require("mongoose");
const { uploadImageToCloudinary } = require("../utils/imageUploader");
const mailSender = require("../utils/mailSender");
const { forgotPassowordTemplate } = require("../utils/emailTemplate");
const Otp = require("../modules/otp");
const bcrypt = require("bcrypt");


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
            const startDate = edu.startYear ? new Date(edu.startYear) : null;
            const endDate = edu.endYear ? new Date(edu.endYear) : null;
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
            const startDate = exp.startYear ? new Date(exp.startYear) : null;
            const endDate = exp.endYear ? new Date(exp.endYear) : null;
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

exports.uploadProfileImage = async (req, res) => {
    try {
        const userId = req.userId;
        const file = req.files && req.files.image;

        if (!file) {
            return res.status(400).json({
                success: false,
                message: "No profile image file uploaded"
            });
        }

        const image = await uploadImageToCloudinary(
            file,
            process.env.FOLDER_NAME || "profile_images",
            400, // height (optional)
            80   // quality (optional)
        );

        const user = await User.findByIdAndUpdate(
            userId,
            { profileImage: image.secure_url },
            { new: true }
        );

        return res.status(200).json({
            success: true,
            message: "Profile image uploaded successfully",
            body: user
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
}

exports.uploadBannerImage = async(req,res) => {
    try { 

        const userId = req.userId;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(400).json({
                success: false,
                message: "User does not exists"
            })
        }

        const file = req.files.bannerImage;
        if (!file) {
            return res.status(400).json({
                success: false,
                message: "Banner Image not found"
            })
        }

        const uploadedImage = await uploadImageToCloudinary(file, process.env.FOLDER_NAME);
        user.bannerImage = uploadedImage.secure_url;
        await user.save();

        return res.status(200).json({
            success: true,
            message: "Banner Uploaded",
            body: user
        })

    } catch(err) {
        return res.status(500).json({
            success: false,
            message: err.message
        })
    }
}

exports.sendForgotPasswordEmail = async(req,res) => {
    try {

        const email = req.body.email;
        const user  = await User.find({email:email});

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "Email does not exists"
            })
        }

        let otp = '';
        for (let i = 0; i < 6; i++) {
            otp += Math.floor(Math.random() * 10);
        }

        await Otp.create({
            email,
            otp,
            type: "Password"
        })

        await mailSender(
			email,
			"Forgot password OTP",
			forgotPassowordTemplate(otp)
		);

        return res.status(200).json({
            success: true,
            message:"Email sent"
        })

    } catch(err) {
        return res.status(500).json({
            success: false,
            message: err.message
        })
    }
}

exports.verifyForgotPasswordOtp = async(req,res) => {
    try {

        const {otp, email} = req.body;

        if (!otp) {
            return res.status(400).json({
                success: false,
                message: "Please send otp"
            })
        }

        const otpPresent = await Otp.findOne({ otp: otp, type: "Password", email: email }).sort({ createdAt: -1 });
        if (!otpPresent) {
            return res.status(400).json({
                success: false,
                message: "Otp Expired"
            })
        }

        if (otp != otpPresent.otp) {
            return res.status(400).json({
                success: false,
                message: "Otp is wrong"
            })
        }

        return res.status(200).json({
            success: true,
            message: "OTP verified"
        })

    } catch(err) {
        return res.status(500).json({
            success: false,
            message: err.message
        })
    }
}

exports.changePassword = async(req,res) => {
    try {

        const {password, confirmPassword, email} = req.body;

        const user = await User.find({email: email}).findOne();

        if (!user) {
            return res.status(400).json({
                success : false,
                message : "User does not exists"
            })
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        user.password = hashedPassword;
        await user.save();
        
        return res.status(200).json({
            success: true,
            message: "Password updated successfully"
        })

    } catch(err) {
        return res.status(500).json({
            success: false,
            message: err.message
        })
    }
}
