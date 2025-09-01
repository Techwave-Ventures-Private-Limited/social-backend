const express = require("express");
const { createEvent, createTicket, getEvent, getAllEvents, bookTicket, getUserBookedEvents, generateEventTicketPDF, getUserEvents, deleteEvent, getAttendesUser } = require("../controller/EventController");
const router = express.Router();
const {auth} = require("../middleware/authMiddleware");

router.post("/createEvent", auth, createEvent);
router.post("/createTicket", auth, createTicket);
router.get("/getUserBookedEvents", auth, getUserBookedEvents);
router.get("/getAllEvents", getAllEvents);
router.get("/ticket/:eventId/:attendeeEmail", auth, generateEventTicketPDF);
router.post("/bookTicket", bookTicket);
router.get("/:eventId", getEvent);
router.get("/user/self", auth, getUserEvents);
router.delete("/:eventId", auth, deleteEvent);
router.get("/attendees/:eventId", auth, getAttendesUser)

module.exports = router;