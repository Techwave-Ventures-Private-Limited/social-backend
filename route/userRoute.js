const express = require("express");
const router = express.Router();

const {getUser, updateUser, uploadProfileImage} = require("../controller/UserController");
const {auth}  = require("../middleware/authMiddleware");
const { followUser } = require("../controller/FollowController");

router.get("/getUser", auth, getUser);
router.post("/update", auth, updateUser);
router.post("/follow", auth, followUser);
router.post("/uploadProfileImage", auth, uploadProfileImage);

module.exports = router;
