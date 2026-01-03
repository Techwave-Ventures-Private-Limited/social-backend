const express = require("express");
const router = express.Router();
const { createPost, getPost, getUserPosts, likePost, savePost, commentPost, deleteComment, getCommentsForPost, getAllPosts, unlikePost, getSavedPost,replyToComment, deletePost, editPost, getCommentsByUser, getHomeFeedWithCommunities, getTrendingPosts, votePoll, getLatestPosts, getHomeFeed, findPostsByHashTag } = require("../controller/PostController");
const {auth}  = require("../middleware/authMiddleware");


router.post("/createPost", auth, createPost);
router.get("/user", auth, getUserPosts);
router.post("/like", auth, likePost);
router.post("/unlike", auth, unlikePost);
router.post("/comment", auth, commentPost);
router.delete("/comment/:commentId", auth, deleteComment);
router.post("/save", auth , savePost);
router.post("/replyToComment", auth, replyToComment);
router.get("/comment/:postId", auth, getCommentsForPost);
router.get("/all/allPosts", auth, getAllPosts);
router.get("/feed/home", auth, getHomeFeedWithCommunities); // Combined home feed with community posts
router.get("/get/save", auth, getSavedPost);
router.post("/edit", auth, editPost);
router.post("/comment/getUser", auth, getCommentsByUser);
router.post("/getPosts", auth, getTrendingPosts);
router.post("/:postId/poll/vote", auth, votePoll);
router.post("/getLatestPosts", auth, getLatestPosts);
router.post("/homefeed", auth, getHomeFeed);
router.get("/hashtag/:tag", auth, findPostsByHashTag);

router.get("/:postId",auth, getPost);
router.delete("/:postId", auth, deletePost);


module.exports = router;
