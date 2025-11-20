const express = require("express");
const router = express.Router();

const { 
    createJob,
    getAllJobs,
    getJobById,
} = require("../controller/JobController");

const {auth}  = require("../middleware/authMiddleware");

// @route   POST /job/create
router.post("/create", auth, createJob);

// @route   GET /job/all
router.get("/all", getAllJobs);

// @route   GET /job/:id
router.get("/:id", getJobById);

module.exports = router;