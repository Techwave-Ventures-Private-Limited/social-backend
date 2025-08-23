const express = require("express");
const {auth} = require("../middleware/authMiddleware");
const { likeComment, unlikeComment } = require("../controller/commentController");
const router = express.Router();

router.post("/like/:commentId", auth, likeComment);
router.post("/unlike/:commentId", auth, unlikeComment);

module.exports = router;
