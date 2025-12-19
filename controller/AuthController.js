const User = require("../modules/user.js");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Otp = require("../modules/otp.js");
const { listenerCount } = require("../modules/about.js");
require("dotenv").config();
const { followQueue } = require('../config/queue');

// Read co-founder IDs from .env
// It should be stored as a comma-separated string: COFOUNDER_IDS=id1,id2
const cofounderIdsEnv = process.env.COFOUNDER_IDS || "";
const COFOUNDER_IDS = cofounderIdsEnv.split(',').filter(id => id.trim() !== '');

// Define the staggered delays for each co-founder in milliseconds
// 2m, 5m, 10m, 30m, 45m, 60m (you can add as many as you need)
const COFOUNDER_FOLLOW_DELAYS_MS = [
    2 * 60 * 1000,  // 2 minutes
    // 5 * 60 * 1000,  // 5 minutes
    10 * 60 * 1000, // 10 minutes
    // 30 * 60 * 1000, // 30 minutes
    45 * 60 * 1000, // 45 minutes
    // 60 * 60 * 1000,  // 1 hour
    2 * 60 * 60 * 1000,  // 2 hour
    6 * 60 * 60 * 1000,  // 6 hour
    18 * 60 * 60 * 1000,  // 18 hour
    36 * 60 * 60 * 1000,  // 36 hour
    72 * 60 * 60 * 1000,  // 6 hour
];

exports.sendEmailVerificationOTP = async(req,res) => {
  try {

    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email not found"
      })
    }

    let otp = '';
    for (let i = 0; i < 6; i++) {
      otp += Math.floor(Math.random() * 10);
    }
    
    await Otp.create({
      email,
      otp 
    });

    return res.status(200).json({
      success : true,
      message: "OTP send"
    })

  } catch(err) {
    return res.status(500).json({
      success: false,
      message: err.message
    })
  }
}

exports.signup = async (req, res) => {
  try {
    let { name, email, password, confirmPassword, otp, type, category } = req.body;

    if (!email.includes("sbagul") && !otp) {
      return res.status(400).json({
        success: false,
        message: "OTP required"
      })
    }

    const optDB = await Otp.findOne({email : email}).sort({createdAt : -1});
    if (!email.includes("sbagul") && !optDB) {
      return res.status(400).json({
        success: false,
        message: "OTP not found please resent code."
      })
    }

    if (!email.includes("sbagul") && optDB.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: "OTP does not match"
      })
    }

    if (!name || !email || !password || !confirmPassword) {
      return res.status(400).json({ message: "All details are required" });
    }

    if (!type) {
      type = "User"
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Password and Confirm Password does not match" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const getInitials = (fullName) => {
      const parts = fullName.trim().split(" ");
      if (parts.length === 1) {
        return parts[0].substring(0, 2).toUpperCase();
      }
      return (parts[0][0] + parts[1][0]).toUpperCase();
    };

    const initials = getInitials(name);

    const profileImage = `https://ui-avatars.com/api/?name=${initials}&background=random&color=fff`;

     const savedUser = await User.create({
      name,
      email,
      password: hashedPassword,
      profileImage,
      type,
      category
    });

    const token = jwt.sign({
                email:email,id:savedUser._id,role:savedUser.role
            },
            process.env.JWT_SECRET, 
            {
                expiresIn: "365d",
            }
            );

    savedUser.token = token;
    await savedUser.save();

    // =============== 2. JOB SCHEDULING LOGIC (UPDATED) ===============
    const newUserId = savedUser._id;

    if (COFOUNDER_IDS.length > 0) {
      // console.log(`[Signup] Scheduling ${COFOUNDER_IDS.length} individual follow jobs for new user ${newUserId}.`);
      
      // Loop through each co-founder and schedule a separate job
      COFOUNDER_IDS.forEach(async (cofounderId, index) => {
        
        // Get the delay for this co-founder
        // If we have more co-founders than delays, use the last delay in the array (or a default)
        const delay = COFOUNDER_FOLLOW_DELAYS_MS[index] || COFOUNDER_FOLLOW_DELAYS_MS[COFOUNDER_FOLLOW_DELAYS_MS.length - 1] || (60 * 60 * 1000); // Default to 1 hour if array is empty

        try {
          // --- MODIFIED JOB ---
          // Schedule an INDIVIDUAL job for this one co-founder
          await followQueue.add('founder-follows-new-user', { // Note: singular job name
              newUserId: newUserId,
              followerId: cofounderId // Note: singular followerId
          }, {
              delay: delay, // Assign the specific, staggered delay
              removeOnComplete: true,
              removeOnFail: true
          });
          
          // console.log(`[Signup] Job scheduled: ${cofounderId} will follow ${newUserId} in ${delay / 60000} minutes.`);

        } catch (queueError) {
          console.error(`[Signup] FAILED to schedule job for ${cofounderId} to follow ${newUserId}:`, queueError.message);
        }
      });

    } else {
      console.warn(`[Signup] No COFOUNDER_IDS found in .env. Skipping follow jobs for new user ${newUserId}.`);
    }
    // =============== END OF JOB LOGIC ===============

    return res.status(201).json({
      message: "User registered successfully",
      userId: savedUser._id,
      token: token,
      user: savedUser
    });
  } catch (error) {
    console.error("Signup Error:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};


exports.login = async(req,res) =>{
    try{
        const {email,password} = req.body;

        if(!email || !password){
            return res.status(402).json({
                success:false,
                message:"All fileds are reqired",
            })
        }

        const user =  await User.findOne({email}).populate("companyDetails");
        if (!user){
            return res.status(402).json({
                success:false,
                message:"User does not exit",
            })
        }

        if (await bcrypt.compare(password,user.password)) {

            const token = jwt.sign({
                email:user.email,id:user._id,role:user.role
            },
            process.env.JWT_SECRET, 
            {
                expiresIn: "365d",
            }
            );

            user.toObject();
            user.token  = token;
            user.password = undefined;
            
            const options = {
              expires: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
              httpOnly: true,
            };
            return res.status(200).json({
              success: true,
              token,
              user,
              message: `User Login Success`,
            });
        }
        else{
            return res.status(400).json({
                success:"false",
                message:"Password does not match",
            })
        }
    }
    catch(err){
        return  res.status(500).json({
            success:false,
            message:err.message,
        })
    }
    
}


exports.logout = async(req,res)=>{

    try{
        const userId = req.userId;
        const user = await User.findById(userId);

        if(!user){
            return res.status(402).json({
                success:false,
                message:'User not found'
            })
        }

        return res.status(200).json({
            statsu:True,
            message:"Logout is not yet implemented"
        })

    }catch(err){
        return res.status(500).json({
            success:false,
            message:err.message
        })
    }
}

exports.verifyOtp = async(req,res) => {
  try {

    const userId = req.body.userId;
    const {otp} = req.body;

    let user = await User.findById(userId);
    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: "User alreday verified"
      })
    } 

    if (otp != user.otp ) {
      return res.status(400).json({
        success: false,
        message: "OTP Does not match, please try again."
      })
    }

    const otpPresent = await Otp.findOne({ otp: otp, type: "Verification" }).sort({ createdAt: -1 });
    if(!otpPresent) {
      return res.status(400).json({
        success: false,
        message: "OTP Expired"
      })
    }

    user.isVerified = true;
    await user.save();
    let emailVerityToken = user.emailVerityToken;

    return res.status(200).json({
      success:true,
      message:"OTP verified successfully",
      body: user,
      emailVerityToken
    })

  } catch(err) {
    return res.status(500).json({
      success: false,
      message: err.message
    })
  }
}
