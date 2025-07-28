const express = require("express");
const { getNews, toggleLikeNews, toggleSaveNews } = require("../controller/NewsController");
const {auth} = require("../middleware/authMiddleware");
const router = express.Router();

router.get("/", auth, getNews);
router.post("/like/:newsId", auth, toggleLikeNews);
router.post("/save/:newsId", auth, toggleSaveNews);

module.exports = router;
