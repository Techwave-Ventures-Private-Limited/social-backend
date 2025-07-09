const express = require("express");
const router = express.Router();

const {getUser, updateUser} = require("../controller/UserController");
const {auth}  = require("../middleware/authMiddleware");
const { followUser } = require("../controller/FollowController");

router.get("/getUser", auth, getUser);
router.post("/update", auth, updateUser);
router.post("/follow", auth, followUser);

module.exports = router;
