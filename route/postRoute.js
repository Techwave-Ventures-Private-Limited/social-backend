const express = require("express");
const router = express.Router();
const { createPost, getPost, getUserPosts, likePost, savePost, commentPost, getCommentsForPost, getAllPosts, unlikePost } = require("../controller/PostController");
const {auth}  = require("../middleware/authMiddleware");


router.post("/createPost", auth, createPost);
router.get("/:postId",auth, getPost);
router.get("/user", auth, getUserPosts);
router.post("/like", auth, likePost);
router.post("/unlike", auth, unlikePost);
router.post("/comment", auth, commentPost);
router.post("/save", auth , savePost);
router.get("/comment/:postId", auth, getCommentsForPost);
router.get("/all/allPosts", auth, getAllPosts);

module.exports = router;
