const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/authMiddleware");
const { applyToOpportunity } = require("../controller/opportunityController");

// Route for a user to apply to an opportunity
// POST /api/v1/opportunity/apply/:opportunityId
router.post("/apply/:opportunityId", auth, applyToOpportunity);

// (You can add other routes here later)
// GET /api/v1/opportunity/applicants/:opportunityId  (To see who applied)
// POST /api/v1/opportunity/close/:opportunityId      (To close the role)

module.exports = router;