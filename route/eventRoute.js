const express = require("express");
const { createEvent, createTicket, getEvent, getAllEvents, bookTicket, getUserBookedEvents, generateEventTicket } = require("../controller/EventController");
const router = express.Router();
const {auth} = require("../middleware/authMiddleware");

router.post("/createEvent", auth, createEvent);
router.post("/createTicket", auth, createTicket);
router.get("/getUserBookedEvents", auth, getUserBookedEvents);
router.post("/bookTicket", bookTicket);
router.get("/getAllEvents", getAllEvents);
router.get("/ticket/:eventId/:attendeeEmail", auth, generateEventTicket);
router.get("/:eventId", getEvent);

module.exports = router;