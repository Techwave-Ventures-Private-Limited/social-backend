const express = require("express");
const {auth} = require("../middleware/authMiddleware");
const { searchAll } = require("../controller/SearchController");
const router = express.Router();


router.get("/all/:text", auth, searchAll);

module.exports = router;
