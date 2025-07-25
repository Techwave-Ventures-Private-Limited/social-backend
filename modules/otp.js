const  mongoose = require("mongoose");
const mailSender = require("../utils/mailSender");
const  {otpTemplate} = require('../utils/emailTemplate');

const otpSchema  = new mongoose.Schema({

    email:{
        type:String,
        required:true,
    },
    otp:{
        type:String,
        required:true,
    },
    type: {
        type: String,
        enum: ["Verification", "Password"],
        default: "Verification"
    },
    createdAt:{
        type:Date,
        default: Date.now,
        expires: 300
    },
})


async function sendVerificationEmail(email, otp) {

	try {
		const mailResponse = await mailSender(
			email,
			"OTP Verification Email from Connektx",
			otpTemplate(otp)
		);
		// console.log("Email sent successfully: ", //mailResponse.response);
	} catch (error) {
		console.log("Error occurred while sending email: ", error);
		throw error;
	}
}

otpSchema.pre("save", async function (next) {
	if (this.isNew && this.type === "Verification") {
		await sendVerificationEmail(this.email, this.otp);
	}
	next();
});

const OTP = mongoose.model("Otp", otpSchema);

module.exports = OTP;