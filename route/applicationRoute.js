const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/authMiddleware");
const multer = require("multer");

const { 
    applyForJob, 
    updateApplicationStatus, 
    getMyApplications,
    getJobApplications,
    getApplicationById
} = require("../controller/applicationController");

// --- Multer Configuration ---
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
        cb(null, true);
    } else {
        cb(new Error("Only PDF files are allowed!"), false);
    }
};

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: fileFilter 
});

// Use auth middleware for all routes
router.use(auth);

// POST /application/apply
router.post("/apply", upload.single("resume"), applyForJob);

// GET /application/my-applications
router.get("/my-applications", getMyApplications);

// POST /application/status
router.post("/status", updateApplicationStatus);

// GET /application/job/:jobId
router.get("/job/:jobId", getJobApplications);

// GET /application/detail/:id
router.get("/detail/:id", getApplicationById);

module.exports = router;