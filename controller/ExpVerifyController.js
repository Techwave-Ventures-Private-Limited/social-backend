const mongoose = require("mongoose");
const OTP = require("../modules/otp")
const User = require("../modules/user");
const Experience = require("../modules/experience");
const Company = require("../modules/Company");
const mailSender = require("../utils/mailSender");
const otpGenerator = require("otp-generator");

// 1. List of Public Domains to Block
const FREE_EMAIL_DOMAINS = [
  "gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "aol.com", 
  "icloud.com", "protonmail.com", "zoho.com", "yandex.com", "mail.com", 
  "gmx.com", "live.com", "me.com"
];

// -----------------------------------------
// SEND WORK OTP
// -----------------------------------------
exports.sendWorkOtp = async (req, res) => {
  try {
    const { email, experienceId } = req.body;

    // 1. Validation: Check for missing fields
    if (!email || !experienceId) {
      return res.status(400).json({
        success: false,
        message: "Email and Experience ID are required",
      });
    }

    // 2. Domain Validation: Block public domains
    const domain = email.split("@")[1].toLowerCase();
    if (FREE_EMAIL_DOMAINS.includes(domain)) {
      return res.status(400).json({
        success: false,
        message: "Please use your official work email, not a personal one.",
      });
    }

    // 3. Check if Experience exists
    const experience = await Experience.findById(experienceId);
    if (!experience) {
      return res.status(404).json({
        success: false,
        message: "Experience record not found",
      });
    }

    // 4. Generate OTP
    const otp = otpGenerator.generate(6, {
      upperCaseAlphabets: false,
      specialChars: false,
      lowerCaseAlphabets: false,
    });

    // 5. Save OTP to DB (Type: "Experience")
    // Note: The pre-save hook in your OTP model will trigger the email sending.
    // Ensure your OTP model handles type: "Experience" or verification logic.
    await OTP.create({
      email,
      otp,
      type: "Experience", // Important: Use the new enum type we discussed
    });

    // Optionally send a specific email template here if not using the pre-save hook
    // await mailSender(email, "Verify your Work Email", workVerificationTemplate(otp));

    return res.status(200).json({
      success: true,
      message: "OTP sent to your work email.",
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Error sending work OTP",
    });
  }
};

// -----------------------------------------
// VERIFY WORK OTP
// -----------------------------------------
exports.verifyWorkOtp = async (req, res) => {
  try {
    const { email, otp, experienceId } = req.body;

    // 1. Find the most recent OTP for this email
    const response = await OTP.find({ email, type: "Experience" })
      .sort({ createdAt: -1 })
      .limit(1);

    if (response.length === 0 || otp !== response[0].otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP",
      });
    }

    // 2. Extract Domain and Company Name
    const domain = email.split("@")[1].toLowerCase();
    // Simple name extraction: "tesla.com" -> "Tesla"
    // You might want a more complex name formatter or let the user provide the name initially
    const companyNameRaw = domain.split(".")[0]; 
    const companyName = companyNameRaw.charAt(0).toUpperCase() + companyNameRaw.slice(1);

    // 3. Find or Create Company (Upsert)
    // This checks if a company with this domain exists. 
    // If YES: returns it. 
    // If NO: creates it with the name and domain.
    const company = await Company.findOneAndUpdate(
      { domain: domain }, // Search query
      { 
        $setOnInsert: { 
          name: companyName, 
          domain: domain, 
          isVerified: true // Auto-verify companies created via email domain? Or set false for admin review
        } 
      },
      { new: true, upsert: true } // Options: return new doc, create if not exists
    );

    // 4. Update User's Experience
    const updatedExperience = await Experience.findByIdAndUpdate(
      experienceId,
      {
        companyId: company._id, // Link to the centralized Company DB
        workEmail: email,
        isVerified: true,
      },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: "Employment verified successfully",
      data: {
        company: company,
        experience: updatedExperience
      }
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Error verifying work OTP",
    });
  }
};