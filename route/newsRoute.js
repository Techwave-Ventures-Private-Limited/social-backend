const express = require("express");
const { getNews } = require("../controller/NewsController");
const router = express.Router();

router.get("/", getNews);

module.exports = router;
