const express = require("express");
const router = express.Router();

const {getUser, updateUser, uploadProfileImage, sendForgotPasswordEmail, verifyForgotPasswordOtp, changePassword} = require("../controller/UserController");
const {createStory, getFollowingStories} = require("../controller/StoryController");
const {auth}  = require("../middleware/authMiddleware");
const { followUser } = require("../controller/FollowController");

router.get("/getUser", auth, getUser);
router.post("/update", auth, updateUser);
router.post("/follow", auth, followUser);
router.post("/uploadProfileImage", auth, uploadProfileImage);
router.post("/upload/story", auth, createStory);
router.get("/story", auth, getFollowingStories);
router.post("/forgotPassword", sendForgotPasswordEmail);
router.post("/verifyForgotPassword", verifyForgotPasswordOtp);
router.post("/changePassword", changePassword);

module.exports = router;
