const express = require("express");
const router = express.Router();

const {
    createJob,
    getAllJobs,
    getJobById,
    jobsByUserId,
    closeJob
} = require("../controller/JobController");

const { auth } = require("../middleware/authMiddleware");
const job = require("../modules/job");

// @route   POST /job/create
router.post("/create", auth, createJob);

// @route   GET /job/all
router.get("/all", getAllJobs);

// @route  GET /:userId/job
router.get("/user/:userId", auth, jobsByUserId);

// @route   GET /job/:id
router.get("/details/:id", auth, getJobById);

// @route   PUT /job/close/:id
router.put("/close/:id", auth, closeJob);

module.exports = router;