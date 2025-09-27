const express = require("express");
const router = express.Router();

const {signup , login, verifyOtp, sendEmailVerificationOTP  } = require("../controller/AuthController")
const {auth}  = require("../middleware/authMiddleware");

router.post("/signup",signup);
router.post("/login",login);
router.post("/otp",verifyOtp);
router.post("/sendEmail", sendEmailVerificationOTP);

module.exports = router;
