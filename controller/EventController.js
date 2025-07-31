const puppeteer = require("puppeteer");
const Event = require("../modules/event");
const User = require("../modules/user");
const Ticket = require("../modules/ticketPlan");
const {uploadImageToCloudinary} = require("../utils/imageUploader");
const { eventTicketTemplate } = require("../utils/eventTicketTemplate");

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
        // Ensure tags is an array
        if (!eventObject.tags || !Array.isArray(eventObject.tags)) {
            eventObject.tags = [];
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
            } else if (date === 'thisWeek') {
                // Get start of current week (Sunday)
                const dayOfWeek = today.getDay();
                start = new Date(today);
                start.setDate(today.getDate() - dayOfWeek);
                start.setHours(0, 0, 0, 0);
                
                // Get end of current week (Saturday)
                end = new Date(start);
                end.setDate(start.getDate() + 6);
                end.setHours(23, 59, 59, 999);
            } else if (date === 'thisMonth') {
                // Get start of current month
                start = new Date(today.getFullYear(), today.getMonth(), 1);
                start.setHours(0, 0, 0, 0);
                
                // Get end of current month
                end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
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
            } else if (date === 'thisWeek') {
                // Get start of current week (Sunday)
                const dayOfWeek = today.getDay();
                start = new Date(today);
                start.setDate(today.getDate() - dayOfWeek);
                start.setHours(0, 0, 0, 0);
                
                // Get end of current week (Saturday)
                end = new Date(start);
                end.setDate(start.getDate() + 6);
                end.setHours(23, 59, 59, 999);
            } else if (date === 'thisMonth') {
                // Get start of current month
                start = new Date(today.getFullYear(), today.getMonth(), 1);
                start.setHours(0, 0, 0, 0);
                
                // Get end of current month
                end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
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

// Book a ticket for an event
exports.bookTicket = async (req, res) => {
    try {
        const { eventId, ticketTypeId, name, email, phone } = req.body;
        if (!eventId || !ticketTypeId || !name || !email) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields (eventId, ticketTypeId, name, email)"
            });
        }

        // Find the event
        const event = await Event.findById(eventId).populate("ticketTypes");
        if (!event) {
            return res.status(404).json({
                success: false,
                message: "Event not found"
            });
        }

        // Find the ticket type
        const ticketType = event.ticketTypes.find(t => t._id.toString() === ticketTypeId);
        if (!ticketType) {
            return res.status(404).json({
                success: false,
                message: "Ticket type not found for this event"
            });
        }

        // Check if tickets are available
        if (ticketType.remTicket <= 0) {
            return res.status(400).json({
                success: false,
                message: "No tickets available for this type"
            });
        }

        // Add attendee to event (if not already present)
        if (!event.attendees) event.attendees = [];
        const alreadyBooked = event.attendees.some(att => att.email === email);
        if (alreadyBooked) {
            return res.status(400).json({
                success: false,
                message: "This email has already booked a ticket for this event"
            });
        }
        event.attendees.push({ name, email, phone });

        // Decrement ticket count
        ticketType.remTicket -= 1;

        // Save changes
        await event.save();
        await ticketType.save && (await ticketType.save()); // In case ticketType is a mongoose doc

        return res.status(200).json({
            success: true,
            message: "Ticket booked successfully",
            body: {
                event,
                ticketType
            }
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
}

exports.getUserBookedEvents = async (req, res) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "User ID is required"
            });
        }

        // Find the user and get their email
        const user = await User.findById(userId).select('email');
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Find events where the user is an attendee
        const events = await Event.find({ "attendees.email": user.email }).populate("ticketTypes");

        return res.status(200).json({
            success: true,
            message: "User booked events fetched successfully",
            body: events
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
}

// Generate event ticket HTML
exports.generateEventTicket = async (req, res) => {
    try {
        const { eventId, attendeeEmail } = req.params;
        const token = req.headers.token;

        if (!eventId || !attendeeEmail) {
            return res.status(400).json({
                success: false,
                message: "Event ID and attendee email are required"
            });
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Authentication token required"
            });
        }

        // Find the event
        const event = await Event.findById(eventId).populate("ticketTypes");

        if (!event) {
            return res.status(404).json({
                success: false,
                message: "Event not found"
            });
        }

        // Find the attendee
        const attendee = event.attendees.find(att => att.email === attendeeEmail);
        if (!attendee) {
            return res.status(404).json({
                success: false,
                message: "Attendee not found for this event"
            });
        }

        // Generate ticket ID
        const ticketId = `${eventId}-${attendee.name.toLowerCase().replace(/\s+/g, '')}`;

        // Format date and time
        const eventDate = new Date(event.date);
        const formattedDate = eventDate.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        const eventTime = event.time || "10:00 AM";

        // Prepare ticket data
        const ticketData = {
            eventTitle: event.title,
            eventDate: formattedDate,
            eventTime: eventTime,
            eventLocation: event.location || "Tech Hub, Bangalore",
            attendeeName: attendee.name,
            attendeeEmail: attendee.email,
            ticketId: ticketId,
            ticketType: event.ticketTypes?.[0]?.name || "General",
            qrCodeData: ticketId
        };

        // Generate HTML and PDF
        const htmlContent = eventTicketTemplate(ticketData);
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
        const pdfBuffer = await page.pdf({ format: 'A4' });
        await browser.close();

        // Set headers and send the PDF
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="ticket-${ticketId}.pdf"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        return res.end(pdfBuffer); // Send PDF and end the response

    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
};
