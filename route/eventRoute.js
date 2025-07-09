const express = require("express");
const { createEvent, createTicket, getEvent } = require("../controller/EventController");
const router = express.Router();
const {auth} = require("../middleware/authMiddleware");

router.post("/createEvent", auth, createEvent);
router.post("/createTicket", auth,createTicket);
router.get("/:eventId", getEvent);

module.exports = router;