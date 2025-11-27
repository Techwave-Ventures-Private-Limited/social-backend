const express = require("express");
const router = express.Router();

const { 
    createJob,
    getAllJobs,
    getJobById,
    jobsByUserId
} = require("../controller/JobController");

const {auth}  = require("../middleware/authMiddleware");
const job = require("../modules/job");

// @route   POST /job/create
router.post("/create", auth, createJob);

// @route   GET /job/all
router.get("/all", getAllJobs);

// @route  GET /:userId/job
router.get("/:userId", auth, jobsByUserId);

// @route   GET /job/:id
router.get("/:id", auth, getJobById);

module.exports = router;