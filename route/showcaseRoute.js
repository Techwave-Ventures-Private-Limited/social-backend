const express = require("express");
const router = express.Router();
const {auth}  = require("../middleware/authMiddleware");
const { createShowcase, getShowcases, getUserShowcase, deleteShowcase } = require("../controller/ShowcaseController");


router.post("/create", auth, createShowcase);
router.get("/get", auth, getShowcases);
router.get("/user", auth, getUserShowcase);
router.delete("/:showcaseId", auth, deleteShowcase);

module.exports = router;