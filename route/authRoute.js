const express = require("express");
const router = express.Router();

const {signup , login, verifyOtp  } = require("../controller/AuthController")
const {auth}  = require("../middleware/authMiddleware");

router.post("/signup",signup);
router.post("/login",login);
router.post("/otp",verifyOtp);

module.exports = router;
