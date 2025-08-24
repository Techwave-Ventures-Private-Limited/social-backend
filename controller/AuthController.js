const User = require("../modules/user.js");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Otp = require("../modules/otp.js");
require("dotenv").config();

exports.signup = async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body;

    if (!name || !email || !password || !confirmPassword) {
      return res.status(400).json({ message: "All details are required" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Password and Confirm Password does not match" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    let emailVerificationToken = jwt.sign(
      { email },
      process.env.JWT_SECRET,
      { expiresIn: "365d" }
    );

    let otp = '';
    for (let i = 0; i < 6; i++) {
      otp += Math.floor(Math.random() * 10);
    }

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
      otp,
      password: hashedPassword,
      emailVerityToken: emailVerificationToken,
      profileImage,
    });

    emailVerificationToken = jwt.sign(
      {
        email,
        id: savedUser._id,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "5d",
      }
    );

    savedUser.emailVerityToken = emailVerificationToken;
    await savedUser.save();

    await Otp.create({
      email: savedUser.email,
      otp: savedUser.otp 
    });

    return res.status(201).json({
      message: "User registered successfully",
      userId: savedUser._id,
      token: emailVerificationToken,
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

        const user =  await User.findOne({email});
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
            return res.cookie("token", token, options).status(200).json({
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
