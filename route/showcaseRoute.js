const express = require("express");
const router = express.Router();
const {auth}  = require("../middleware/authMiddleware");
const { createShowcase, getShowcases } = require("../controller/ShowcaseController");


router.post("/create", auth, createShowcase);
router.get("/get", auth, getShowcases);

module.exports = router;