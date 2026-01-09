const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema({
  userId: {
    type: String,
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  shortDescription: {
    type: String,
  },
  date: {
    type: String,
    required: true,
  },
  time: {
    type: String,
    required: true,
  },
  location: {
    type: String,
    required: true,
  },
  isOnline: {
    type: Boolean,
    default: false,
  },
  onlineEventLink: {
    type: String,
  },
  banner: {
    type: String,
  },
  organizer: {
    type: String,
    required: true,
  },
  organizerId: {
    type: String,
    required: true,
  },
  communityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Community',
    default: null,        // This can be null if it's a global event not tied to a community
  },
  category: {
    type: String,
    enum: [
      "Workshop",
      "Meetup",
      "Pitch",
      "Seminar",
      "Hackathon",
      "Webinar",
      "Conference",
      "Networking",
    ],
    required: true,
  },
  isPaid: {
    type: Boolean,
    default: true,
  },
  ticketTypes: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TicketPlan",
      required: true,
    },
  ],
  maxAttendees: {
    type: Number,
  },
  attendees: [
    {
      name: { type: String },
      email: { type: String },
      phone: { type: String },
      ticketTypeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "TicketPlan",
        required: true,
      },
    },
  ],
  tags: {
    type: [String],
    default: []
  },
  speakers: {
    type: [String],
    default: []
  },
  createdBy: {
    type: String,
    required: true,
  },
  likes: [
    {
      type: String,
    },
  ],
  bookmarks: [
    {
      type: String,
    },
  ],
  isExternal: {
    type: Boolean,
    default: false,
  },
  externalUrl: {
    type: String,
  },
},
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Event", eventSchema);
