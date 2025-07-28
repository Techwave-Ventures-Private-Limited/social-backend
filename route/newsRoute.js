const express = require("express");
const { getNews, toggleLikeNews, toggleSaveNews, getSavedNews } = require("../controller/NewsController");
const {auth} = require("../middleware/authMiddleware");
const router = express.Router();

router.get("/", auth, getNews);
router.post("/like/:newsId", auth, toggleLikeNews);
router.post("/save/:newsId", auth, toggleSaveNews);
router.get("/saved", auth, getSavedNews);

module.exports = router;
