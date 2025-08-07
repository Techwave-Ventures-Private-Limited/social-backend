const express = require("express");
const router = express.Router();
const {auth}  = require("../middleware/authMiddleware");
const { createShowcase, getShowcases, getUserShowcase } = require("../controller/ShowcaseController");


router.post("/create", auth, createShowcase);
router.get("/get", auth, getShowcases);
router.get("/user", auth, getUserShowcase);

module.exports = router;