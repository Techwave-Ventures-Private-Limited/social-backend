const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/authMiddleware");
const { applyToOpportunity, getApplicantsForOpportunity } = require("../controller/opportunityController");

// Route for a user to apply to an opportunity
// POST /opportunity/apply/:opportunityId
router.post("/apply/:opportunityId", auth, applyToOpportunity);

// GET /opportunity/applicants/:opportunityId  (To see who applied)
router.get("/applicants/:opportunityId", auth, getApplicantsForOpportunity);

// POST /api/v1/opportunity/close/:opportunityId      (To close the role)

module.exports = router;