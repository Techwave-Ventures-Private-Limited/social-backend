const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/authMiddleware');
const { sendWorkOtp, verifyWorkOtp, getAllCompanies} = require('../controller/ExpVerifyController');

// Apply authentication middleware to all routes in this file
router.use(auth);

// Experience Verification Routes /experience
router.post("/send-verification", sendWorkOtp);
router.post("/verify-otp", verifyWorkOtp);
router.get("/companies", getAllCompanies);

module.exports = router;