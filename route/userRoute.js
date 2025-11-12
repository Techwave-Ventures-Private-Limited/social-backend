const express = require("express");
const router = express.Router();

const {getUser, updateUser, uploadProfileImage, sendForgotPasswordEmail, verifyForgotPasswordOtp, changePassword, uploadBannerImage, getAnotherUser, addPortfolio, registerDeviceToken, deletePortfolio, getBulkUsers, getSelfFollowers, getSelfFollowing, getUserFollowers, getUserFollowing, getConnections, getRecommendedUsers,} = require("../controller/UserController");
const {createStory, getFollowingStories, getCurrentStory, deleteStory} = require("../controller/StoryController");
const {auth}  = require("../middleware/authMiddleware");
const { followUser, unFollowUser } = require("../controller/FollowController");
const {commentOnStory,getCommentsByStoryId,saveCommentslikeByStoryId} = require("../controller/commentController");

router.get("/getUser", auth, getUser);
router.get("/story", auth, getFollowingStories);
router.post("/update", auth, updateUser);
router.post("/follow", auth, followUser);
router.post("/unfollow", auth, unFollowUser);

// --- NEW AND CORRECTED FOLLOWER/FOLLOWING ROUTES ---
// Get the logged-in user's own followers and following lists
router.get("/followers", auth, getSelfFollowers);
router.get("/following", auth, getSelfFollowing);

// Get a specific user's followers and following lists (e.g., for public profiles)
router.get("/:userId/followers", auth, getUserFollowers);
router.get("/:userId/following", auth, getUserFollowing);


router.post("/uploadProfileImage", auth, uploadProfileImage);
router.post("/upload/story", auth, createStory);
router.get("/story/self", auth, getCurrentStory);
router.post("/story/comment", auth, commentOnStory);
router.get("/story/:storyId/comments", getCommentsByStoryId);
router.put("/storyId/:storyId/commnentId/:commentId/saveComment", auth, saveCommentslikeByStoryId);
router.post("/getBulkUser", auth, getBulkUsers);
// router.get("/followers", auth, getFollowers);


router.post("/forgotPassword", sendForgotPasswordEmail);
router.post("/verifyForgotPassword", verifyForgotPasswordOtp);
router.post("/changePassword", changePassword);
router.post("/uploadBannerImage", auth, uploadBannerImage);
router.delete("/story/:storyId", auth, deleteStory);
router.post("/portfolio", auth, addPortfolio);
router.delete("/portfolio/:id", auth, deletePortfolio);


router.post("/register-device-token", auth, registerDeviceToken);
router.get('/connections', auth, getConnections);

router.get("/:userId", auth, getAnotherUser);

// NEW RECOMMENDATION ROUTE
router.get("/recommendations", auth, getRecommendedUsers);

module.exports = router;
