const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/authMiddleware");

const { 
    applyForJob, 
    updateApplicationStatus, 
    getMyApplications,
    getJobApplications,
    getApplicationById
} = require("../controller/applicationController");

// Use auth middleware for all routes
router.use(auth);

// POST /application/apply
router.post("/apply", applyForJob);

// GET /application/my-applications
router.get("/my-applications", getMyApplications);

// POST /application/status
router.post("/status", updateApplicationStatus);

// GET /application/job/:jobId
router.get("/job/:jobId", getJobApplications);

// GET /application/detail/:id
router.get("/detail/:id", getApplicationById);

module.exports = router;