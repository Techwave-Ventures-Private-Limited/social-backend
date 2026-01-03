const express = require("express");
const { auth } = require("../middleware/authMiddleware");
const { searchAll, searchUsers } = require("../controller/SearchController");
const router = express.Router();


router.get("/", auth, searchUsers);

module.exports = router;
