const Event = require("../modules/event");
const User = require("../modules/user");
const Ticket = require("../modules/ticketPlan");
const {uploadImageToCloudinary} = require("../utils/imageUploader")

exports.createEvent = async(req,res) => {
    try{
        const eventObject = req.body;
        const userId = req.userId;
        eventObject.createdBy = userId;
        eventObject.organizerId = eventObject.organizerId || userId;
        // Remove deprecated/old fields if present
        delete eventObject.userId;
        delete eventObject.isEventOnline;
        delete eventObject.isPaidEvent;
        delete eventObject.des;
        delete eventObject.ticketPlan;

        // Validate required fields (optional: add more validation as needed)
        const user = await User.findById(userId);
        if(!user) {
            return res.status(400).json({
                success:false,
                message: "User Not found"
            })
        }

        // Handle banner upload
        let bannerUrl = eventObject.banner;
        if (req.files && req.files.banner) {
            const image = await uploadImageToCloudinary(
                req.files.banner,
                process.env.FOLDER_NAME,
                1000,
                1000
            );
            bannerUrl = image.secure_url;
        }
        eventObject.banner = bannerUrl;


        // Handle ticketTypes (was ticketPlan)
        if (typeof eventObject.ticketTypes === 'string') {
            try {
                eventObject.ticketTypes = JSON.parse(eventObject.ticketTypes);
            } catch (error) {
                // Fallback to comma-separated if JSON parsing fails
                eventObject.ticketTypes = eventObject.ticketTypes.split(",");
            }
        }

        // Handle attendees array
        if (eventObject.attendees && typeof eventObject.attendees === 'string') {
            try {
                eventObject.attendees = JSON.parse(eventObject.attendees);
            } catch (error) {
                // If it's an empty array string, make it empty array
                if (eventObject.attendees === '[]') {
                    eventObject.attendees = [];
                } else {
                    eventObject.attendees = eventObject.attendees.split(",");
                }
            }
        }

        // Handle likes array
        if (eventObject.likes && typeof eventObject.likes === 'string') {
            try {
                eventObject.likes = JSON.parse(eventObject.likes);
            } catch (error) {
                if (eventObject.likes === '[]') {
                    eventObject.likes = [];
                } else {
                    eventObject.likes = eventObject.likes.split(",");
                }
            }
        }

        // Handle bookmarks array
        if (eventObject.bookmarks && typeof eventObject.bookmarks === 'string') {
            try {
                eventObject.bookmarks = JSON.parse(eventObject.bookmarks);
            } catch (error) {
                if (eventObject.bookmarks === '[]') {
                    eventObject.bookmarks = [];
                } else {
                    eventObject.bookmarks = eventObject.bookmarks.split(",");
                }
            }
        }

        // Handle tags array
        if (eventObject.tags && typeof eventObject.tags === 'string') {
            try {
                eventObject.tags = JSON.parse(eventObject.tags);
            } catch (error) {
                eventObject.tags = eventObject.tags.split(",");
            }
        }

        // Handle speakers array
        if (eventObject.speakers && typeof eventObject.speakers === 'string') {
            try {
                eventObject.speakers = JSON.parse(eventObject.speakers);
            } catch (error) {
                eventObject.speakers = eventObject.speakers.split(",");
            }
        }

        // Convert boolean strings to actual booleans
        if (typeof eventObject.isPaid === 'string') {
            eventObject.isPaid = eventObject.isPaid === 'true';
        }
        if (typeof eventObject.isOnline === 'string') {
            eventObject.isOnline = eventObject.isOnline === 'true';
        }

        // Convert maxAttendees to number if it's a string
        if (eventObject.maxAttendees && typeof eventObject.maxAttendees === 'string') {
            eventObject.maxAttendees = parseInt(eventObject.maxAttendees);
        }

        // Create the event
        const createdEvent = await Event.create(eventObject);
        if (!user.event) user.event = [];
        user.event.push(createdEvent._id);
        await user.save();

        return res.status(200).json({
            success:true,
            message: "Event created successfully",
            body: createdEvent
        })

    } catch(err) {
        return res.status(500).json({
            success: false,
            message: err.message
        })
    }
}


exports.createTicket = async(req,res) =>{
    try{

        const {name, price, remTicket} = req.body;
        const userId = req.userId;
        const createdTicket = await Ticket.create({name, price, remTicket, userId});

        return res.status(200).json({
            success:true,
            message:"Ticket created Successfully",
            body: createdTicket
        })

    } catch(err) {
        return res.status(500).json({
            success: false,
            message: err.message
        })
    }
}

exports.getEvent = async(req,res) => {
    try{
        const {eventId} = req.params;

        if(!eventId) {
            return res.status(400).json({
                success:false,
                message:"EventId required"
            })
        }

        const event = await Event.findById(eventId).populate("ticketTypes");

        return res.status(200).json({
            success:false,
            message:"Event found",
            body: event
        })
        
    } catch(err) {
        return res.status(500).json({
            success: false,
            message: err.message
        })
    }
}

exports.getUserEvents = async(req,res) => {
    try{

        const userId = req.userId;

        if(!userId)  {
            return res.status(400).json({
                success:false,
                message:"UserId required"
            })
        }

        const events = await Event.find({userId: userId});

        return res.status(200).json({
            success:true,
            message:"Events found",
            body: events
        })

    } catch(err) {
        return res.status(500).json({
            success: false,
            message:err.message
        })
    }
}

// Get all events with filters and date logic
exports.getAllEvents = async (req, res) => {
    try {
        const { category, isPaid, isOnline, date } = req.query;
        const filter = {};

        // Category filter
        if (category && category !== 'all') {
            filter.category = category;
        }
        // isPaid filter
        if (isPaid && isPaid !== 'all') {
            if (isPaid === 'free') filter.isPaid = false;
            else if (isPaid === 'paid') filter.isPaid = true;
        }
        // isOnline filter
        if (isOnline && isOnline !== 'all') {
            if (isOnline === 'online') filter.isOnline = true;
            else if (isOnline === 'offline') filter.isOnline = false;
        }

        // Date filter
        if (date && date !== 'all') {
            let start, end;
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (date === 'today') {
                start = new Date(today);
                end = new Date(today);
                end.setHours(23, 59, 59, 999);
            } else if (date === 'tomorrow') {
                start = new Date(today);
                start.setDate(start.getDate() + 1);
                end = new Date(start);
                end.setHours(23, 59, 59, 999);
            } else {
                // Specific date (YYYY-MM-DD)
                start = new Date(date);
                start.setHours(0, 0, 0, 0);
                end = new Date(date);
                end.setHours(23, 59, 59, 999);
            }
            // Event date is stored as string, so filter in-memory after fetching
            filter.date = { $gte: start.toISOString().split('T')[0], $lte: end.toISOString().split('T')[0] };
        }

        // Fetch events
        let events = await Event.find(filter).populate("ticketTypes");

        // If date filter is today/tomorrow/specific, double-check with JS Date (in case of string date field)
        if (date && date !== 'all') {
            let start, end;
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (date === 'today') {
                start = new Date(today);
                end = new Date(today);
                end.setHours(23, 59, 59, 999);
            } else if (date === 'tomorrow') {
                start = new Date(today);
                start.setDate(start.getDate() + 1);
                end = new Date(start);
                end.setHours(23, 59, 59, 999);
            } else {
                start = new Date(date);
                start.setHours(0, 0, 0, 0);
                end = new Date(date);
                end.setHours(23, 59, 59, 999);
            }
            events = events.filter(event => {
                const eventDate = new Date(event.date);
                return eventDate >= start && eventDate <= end;
            });
        }

        // Sort by date ascending
        events.sort((a, b) => new Date(a.date) - new Date(b.date));

        return res.status(200).json({
            success: true,
            message: "All events fetched successfully",
            body: events
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
}