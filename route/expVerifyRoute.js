const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/authMiddleware');
const { sendWorkOtp, verifyWorkOtp} = require('../controller/ExpVerifyController');

// Apply authentication middleware to all routes in this file
router.use(auth);

router.post("/send-verification", sendWorkOtp);
router.post("/verify-otp", verifyWorkOtp);

module.exports = router;