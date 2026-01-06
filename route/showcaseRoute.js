const express = require("express");
const router = express.Router();
const {auth}  = require("../middleware/authMiddleware");
const { createShowcase, getShowcases, getUserShowcase, deleteShowcase, upvote, downvote, commentShowcase, getCommentsForShowcase, replyToComment } = require("../controller/ShowcaseController");
const { requireActivePlan, requireFeature } = require("../middleware/purchaseMiddleware");
const PLAN_FEATURES = require("../constants/PlanFeatures");

router.post("/create", auth, requireActivePlan, requireFeature(PLAN_FEATURES.BASIC.CREATE_SHOWCASE), createShowcase);
router.get("/get", auth, getShowcases);
router.get("/user", auth, getUserShowcase);
router.delete("/:showcaseId", auth, deleteShowcase);
router.post("/upvote/:showcaseId", auth, upvote);
router.post("/downvote/:showcaseId", auth , downvote);
router.post("/comment", auth, commentShowcase);
router.get("/comment/:showcaseId", auth, getCommentsForShowcase);
router.post("/replyToComment", auth, replyToComment);


module.exports = router;