const express = require("express");
const router = express.Router();

const {getUser, updateUser, uploadProfileImage, sendForgotPasswordEmail, verifyForgotPasswordOtp, changePassword, uploadBannerImage, getAnotherUser, addPortfolio, registerDeviceToken, deletePortfolio, getBulkUsers, getFollowers} = require("../controller/UserController");
const {createStory, getFollowingStories, getCurrentStory, deleteStory} = require("../controller/StoryController");
const {auth}  = require("../middleware/authMiddleware");
const { followUser, unFollowUser } = require("../controller/FollowController");
const {commentOnStory,getCommentsByStoryId} = require("../controller/commentController");

router.get("/getUser", auth, getUser);
router.get("/story", auth, getFollowingStories);
router.get("/:userId", auth, getAnotherUser);
router.post("/update", auth, updateUser);
router.post("/follow", auth, followUser);
router.post("/unfollow", auth, unFollowUser);
router.post("/uploadProfileImage", auth, uploadProfileImage);
router.post("/upload/story", auth, createStory);
router.get("/story/self", auth, getCurrentStory);
router.post("/story/comment", auth, commentOnStory);
router.get("/story/:storyId/comments", getCommentsByStoryId);
router.post("/getBulkUser", auth, getBulkUsers);
router.get("/followers", auth, getFollowers);


router.post("/forgotPassword", sendForgotPasswordEmail);
router.post("/verifyForgotPassword", verifyForgotPasswordOtp);
router.post("/changePassword", changePassword);
router.post("/uploadBannerImage", auth, uploadBannerImage);
router.delete("/story/:storyId", auth, deleteStory);
router.post("/portfolio", auth, addPortfolio);
router.delete("/portfolio/:id", auth, deletePortfolio);

router.post("/register-device-token", auth, registerDeviceToken);

module.exports = router;
