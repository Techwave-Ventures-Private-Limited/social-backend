const express = require("express");
const router = express.Router();

const { 
    createJob, 
} = require("../controller/JobController");

const {auth}  = require("../middleware/authMiddleware");

// @route   POST /job/create
router.post("/create", auth, createJob);

// @route   GET /job/all
// router.get("/all", getAllJobs);

module.exports = router;