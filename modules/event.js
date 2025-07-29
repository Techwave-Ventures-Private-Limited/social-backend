const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true }, // was 'des'
    shortDescription: { type: String }, // optional
    date: { type: String, required: true },
    time: { type: String, required: true },
    location: { type: String, required: true },
    banner: { type: String, },
    organizer: { type: String, required: true },
    organizerId: { type: String, required: true }, // new
    isPaid: { type: Boolean, default: true }, // was 'isPaidEvent'
    isOnline: { type: Boolean, default: false }, // was 'isEventOnline'
    onlineEventLink: { type: String }, // optional
    category: {
        type: String,
        enum: ['Workshop', 'Meetup', 'Pitch', 'Seminar', 'Hackathon', 'Webinar', 'Conference', 'Networking'],
        required: true
    },
    ticketTypes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "TicketPlan",
        required: true
    }],
    maxAttendees: { type: Number }, // optional
    attendees: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],
    tags: [{ type: String }],
    speakers: [{ type: String }],
    createdBy: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    likes: [{ type: String }], // array of user IDs
    bookmarks: [{ type: String }], // array of user IDs
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Event", eventSchema);

