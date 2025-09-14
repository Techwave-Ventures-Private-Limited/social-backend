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
const Portfolio = require("../modules/portfolio");


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

exports.getAnotherUser = async(req,res) => {
    try{
        const userId = req.params.userId;
        const currUserId = req.userId;


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

        const currUser = await User.findById(currUserId);
        if (currUser.following.includes(user._id)) {
            user.isFollowing = true;
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
            name, bio, headline, education = [], experience = [],
            skills = [], location = "", phone = "", website = ""
        } = req.body;

        user.name = name || user.name;
        user.bio = bio || user.bio;
        user.headline = headline || user.headline;
       
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
            const startDate = edu.startDate ? new Date(edu.startDate) : new Date();
            const endDate = edu.endDate && edu.endDate !== "Present" ? new Date(edu.endDate) : new Date();
            if (edu.id && mongoose.Types.ObjectId.isValid(edu.id)) {
                eduDoc = await Education.findByIdAndUpdate(
                    edu.id,
                    {
                        name: edu.institution,
                        school: edu.institution,
                        fos: edu.field,
                        degree: edu.degree,
                        current: edu.current,
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
                    current: edu.current,
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
            const startDate = exp.startDate ? new Date(exp.startDate) : new Date();
            const endDate = exp.endDate && exp.endDate !== "Present" ? new Date(exp.endDate) : new Date();
            if (exp.id && mongoose.Types.ObjectId.isValid(exp.id)) {
                expDoc = await Experience.findByIdAndUpdate(
                    exp.id,
                    {
                        name: exp.company,
                        role: exp.position,
                        startDate,
                        endDate,
                        desc: exp.description,
                        current: exp.current
                    },
                    { new: true, upsert: true }
                );
            } else {
                expDoc = await Experience.create({
                    name: exp.company,
                    role: exp.position,
                    startDate,
                    endDate,
                    desc: exp.description,
                    current: exp.current
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

exports.addPortfolio = async(req,res) => {
    try {

        const userId = req.userId;
        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(400).json({
                success: false,
                message: "User not found"
            })
        }

        const logo = req.files.logo;
        if (!logo) {
            return res.status(400).json({
                success: false,
                message : "Logo is required"
            })
        }

        const {link, description, title} = req.body;
        if (!link || !title) {
            return res.status(400).json({
                success: false,
                message: "Link and title required"
            })
        }

        const uploadedImage = await uploadImageToCloudinary(logo, process.env.FOLDER_NAME || "portfolio_images");
        const portfolio = await Portfolio.create({
            logo: uploadedImage.secure_url,
            link,
            desc : description,
            userId,
            title
        })

        user.portfolio.push(portfolio._id);
        await user.save();

        return res.status(200).json({
            success: true,
            message :"Portfolio created successfully",
            body : portfolio
        })

    } catch(err) {
        return res.status(500).json({
            success: false,
            message: err.message
        })
    }
}

exports.deletePortfolio = async(req,res) => {
    try {

        const id = req.params.id;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Id required"
            })
        }

        await Portfolio.findByIdAndDelete(id);

        const user = await User.findById(req.userId);

        if (!user) {
            return res.status(400).json({
                success: false,
                message:" User not found"
            })
        }

        await user.portfolio.pull(id);
        await user.save();

        return res.status(200).json({
            success: true,
            message: "Portfolio deleted"
        })

    } catch(err) {
        return res.status(500).json({
            success: false,
            message: err.message
        })
    }
}


exports.registerDeviceToken = async (req, res) => {
    try {
        const { token } = req.body;
        const userId = req.userId;

        // console.log(`[Push Token] Attempting to register token for userId: ${userId}`);
        // console.log(`[Push Token] Received token from client: ${token}`);

        if (!token) {
            return res.status(400).json({ success: false, message: "Device token is required." });
        }

        const user = await User.findById(userId);
        if (!user) {
            // console.error(`[Push Token] User not found for ID: ${userId}`);
            return res.status(404).json({ success: false, message: "User not found." });
        }

        if (!user.deviceTokens.includes(token)) {
            user.deviceTokens.push(token);

            // --- THIS IS THE FIX ---
            // Explicitly tell Mongoose that the deviceTokens array has changed.
            user.markModified('deviceTokens');
            // --- END OF FIX ---

            await user.save();
            // console.log(`[Push Token] Successfully saved token for userId: ${userId}`);
        } else {
            // console.log(`[Push Token] Token already exists for userId: ${userId}. No action taken.`);
        }

        return res.status(200).json({
            success: true,
            message: "Device token registered successfully.",
        });

    } catch (err) {
        // console.error(`[Push Token] Error during registration: ${err.message}`);
        return res.status(500).json({
            success: false,
            message: err.message,
        });
    }
};

exports.getBulkUsers = async (req, res) => {
  try {
    const ids = req.body.ids;
    // console.log(ids)
    if (!ids || !Array.isArray(ids)) {
        return res.status(400).json({
            success: false,
            message: "UserId array required",
        });
    }

    //const userIds = ids.split(",");

    const users = await User.find({ _id: { $in: ids } });

    return res.status(200).json({
      success: true,
      body: users,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


// exports.getFollowers = async (req, res) => {
//     try {
//         const userId = req.userId; // Get the logged-in user's ID from the auth middleware

//         if (!userId) {
//             return res.status(401).json({
//                 success: false,
//                 message: "Unauthorized request",
//             });
//         }

//         // Find the user and populate the 'following' field to get the full user objects
//         const user = await User.findById(userId).populate({
//             path: 'following',
//             select: '_id name profileImage' // Select only the fields you need for the share sheet
//         }).lean();

//         if (!user) {
//             return res.status(404).json({
//                 success: false,
//                 message: "User not found",
//             });
//         }

//         // The 'following' array now contains the full user profiles
//         const followers = user.following;

//         return res.status(200).json({
//             success: true,
//             message: "Followers fetched successfully",
//             body: followers,
//         });

//     } catch (err) {
//         console.error("Error in getFollowers controller:", err.message);
//         return res.status(500).json({
//             success: false,
//             message: err.message,
//         });
//     }
// };


/**
 * @description Get the list of users who follow the currently authenticated user.
 */
exports.getSelfFollowers = async (req, res) => {
    try {
        const userId = req.userId;

        // Find all users who are following the current user
        const followers = await User.find({ following: userId })
            .select('_id name profileImage bio headline')
            .lean();

        return res.status(200).json({
            success: true,
            message: "Followers fetched successfully",
            body: followers,
        });

    } catch (err) {
        console.error("Error in getSelfFollowers controller:", err.message);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch followers.",
        });
    }
};

/**
 * @description Get the list of users the currently authenticated user is following.
 */
exports.getSelfFollowing = async (req, res) => {
    try {
        const userId = req.userId;

        const user = await User.findById(userId)
            .populate({
                path: 'following',
                select: '_id name profileImage bio headline'
            })
            .lean();

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        return res.status(200).json({
            success: true,
            message: "Following list fetched successfully",
            body: user.following || [],
        });

    } catch (err) {
        console.error("Error in getSelfFollowing controller:", err.message);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch following list.",
        });
    }
};

/**
 * @description Get the followers list for a specific user by their ID.
 */
exports.getUserFollowers = async (req, res) => {
    try {
        const { userId } = req.params;

        // Find all users who are following the specified userId
        const followers = await User.find({ following: userId })
            .select('_id name profileImage bio headline')
            .lean();

        return res.status(200).json({
            success: true,
            message: `Followers for user ${userId} fetched successfully`,
            body: followers,
        });

    } catch (err) {
        console.error("Error in getUserFollowers controller:", err.message);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch user's followers.",
        });
    }
};

/**
 * @description Get the following list for a specific user by their ID.
 */
exports.getUserFollowing = async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await User.findById(userId)
            .populate({
                path: 'following',
                select: '_id name profileImage bio headline'
            })
            .lean();

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        return res.status(200).json({
            success: true,
            message: `Following list for user ${userId} fetched successfully`,
            body: user.following || [],
        });

    } catch (err) {
        console.error("Error in getUserFollowing controller:", err.message);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch user's following list.",
        });
    }
};


exports.getConnections = async (req, res) => {
    try {
        const userId = req.userId;
        // console.log(`[CONNECTIONS] Fetching connections for authenticated user ID: ${userId}`);

        if (!userId) {
            return res.status(401).json({ success: false, message: 'Authentication error: User ID not found.' });
        }

        const user = await User.findById(userId)
            .populate('followers', 'name profileImage headline') // Populate with specific fields for efficiency
            .populate('following', 'name profileImage headline');

        if (!user) {
            console.error(`[CONNECTIONS] User with ID ${userId} not found in database.`);
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // --- Critical Debugging Logs ---
        // console.log(`[CONNECTIONS] Found user: ${user.name}`);
        // console.log(`[CONNECTIONS] Raw followers array (before populate):`, user.followers.map(f => f._id));
        // console.log(`[CONNECTIONS] Populated followers count: ${user.followers.length}`);
        // console.log(`[CONNECTIONS] Populated following count: ${user.following.length}`);

        // Use a Map to combine and de-duplicate the lists
        const connectionsMap = new Map();
        
        // Add followers to the map
        user.followers.forEach(follower => {
            connectionsMap.set(follower._id.toString(), follower);
        });
        
        // Add following to the map (will overwrite duplicates, which is fine)
        user.following.forEach(followedUser => {
            connectionsMap.set(followedUser._id.toString(), followedUser);
        });

        // Convert the map values back to an array for the response
        const uniqueConnections = Array.from(connectionsMap.values());
        // console.log(`[CONNECTIONS] Total unique connections: ${uniqueConnections.length}`);

        return res.status(200).json({ success: true, body: uniqueConnections });

    } catch (error) {
        console.error("💥 [FATAL ERROR] getConnections controller crashed:", error);
        res.status(500).json({ success: false, message: 'Server error while fetching connections.', error: error.message });
    }
};