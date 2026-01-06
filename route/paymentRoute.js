const express = require("express");
const router = express.Router();

const { auth } = require("../middleware/authMiddleware");
const { blockMultiplePlans } = require("../middleware/purchaseMiddleware");

const { capturePayment, verifyPayment, getMyActivePlan, cancelMyPlan, } = require("../controller/PaymentController");

router.post("/createorder", auth, blockMultiplePlans, capturePayment);
router.post("/verifypayment", auth, blockMultiplePlans, verifyPayment);
router.get("/gethighestapplicableplan", auth, getMyActivePlan);
router.post("/cancel", auth, cancelMyPlan);

module.exports = router;
