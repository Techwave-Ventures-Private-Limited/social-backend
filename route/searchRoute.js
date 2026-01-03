const express = require("express");
const { auth } = require("../middleware/authMiddleware");
const { searchPost, searchUsers } = require("../controller/SearchController");
const router = express.Router();


router.get("/", auth, searchUsers);
router.get("/post", auth, searchPost);

module.exports = router;
