const pdf = require('html-pdf-node');
const Community = require("../modules/community"); 
const Event = require("../modules/event");
const User = require("../modules/user");
const Ticket = require("../modules/ticketPlan");
const {uploadImageToCloudinary} = require("../utils/imageUploader");
const { eventTicketTemplate } = require("../utils/eventTicketTemplate");

exports.createEvent = async(req,res) => {
    try{
        const eventObject = req.body;
        const userId = req.userId;

        const { communityId } = eventObject;

        if (communityId) {
            const community = await Community.findById(communityId);
            if (!community) {
                return res.status(404).json({
                    success: false,
                    message: "Community not found"
                });
            }

            // PERMISSION CHECK: User must be owner or admin
            const isOwner = community.owner.toString() === userId;
            const isAdmin = community.admins.includes(userId);

            if (!isOwner && !isAdmin) {
                return res.status(403).json({
                    success: false,
                    message: "Permission denied: Only community owners or admins can create events."
                });
            }
            
            // If permission check passes, link the event to the community
            eventObject.communityId = communityId;
        }

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

        eventObject.userId = userId;

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

        const events = await Event.find({ userId: userId });

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
        event.attendees.push({ name, email, phone, ticketTypeId: ticketType._id });

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
// exports.generateEventTicketPDF = async (req, res) => {
//     try {
//         const { eventId, attendeeEmail } = req.params;
//         const token = req.headers.token;

//         if (!eventId || !attendeeEmail) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Event ID and attendee email are required"
//             });
//         }

//         if (!token) {
//             return res.status(401).json({
//                 success: false,
//                 message: "Authentication token required"
//             });
//         }

//         // Find the event
//         const event = await Event.findById(eventId).populate("ticketTypes");
//         if (!event) {
//             return res.status(404).json({
//                 success: false,
//                 message: "Event not found"
//             });
//         }

//         // Find the attendee
//         const attendee = event.attendees.find(att => att.email === attendeeEmail);
//         if (!attendee) {
//             return res.status(404).json({
//                 success: false,
//                 message: "Attendee not found for this event"
//             });
//         }

//         // Prepare ticket data (same as before)
//         const ticketId = `${eventId}-${attendee.name.toLowerCase().replace(/\\s+/g, '')}`;
//         const eventDate = new Date(event.date);
//         const formattedDate = eventDate.toLocaleDateString('en-US', {
//             weekday: 'long',
//             year: 'numeric',
//             month: 'long',
//             day: 'numeric'
//         });
//         const eventTime = event.time || "10:00 AM";
//         const ticketData = {
//             eventTitle: event.title,
//             eventDate: formattedDate,
//             eventTime: eventTime,
//             eventLocation: event.location || "Tech Hub, Bangalore",
//             attendeeName: attendee.name,
//             attendeeEmail: attendee.email,
//             ticketId: ticketId,
//             ticketType: event.ticketTypes && event.ticketTypes.length > 0 ? event.ticketTypes[0].name : "General",
//             qrCodeData: ticketId
//         };

//         // Generate HTML
//         const htmlContent = eventTicketTemplate(ticketData);

//         // Generate PDF
//         const file = { content: htmlContent };
//         const pdfBuffer = await pdf.generatePdf(file, { format: 'A4' });

//         res.set({
//             'Content-Type': 'application/pdf',
//             'Content-Disposition': `attachment; filename=\"ticket-${ticketId}.pdf\"`
//         });
//         res.send(pdfBuffer);
//     } catch (err) {
//         return res.status(500).json({
//             success: false,
//             message: err.message
//         });
//     }
// };

const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

// Vector icons
function drawCalendarIcon(doc, x, y, size = 16) {
  const w = size;
  const h = size;
  doc.save();
  doc.lineWidth(1.2);
  doc.roundedRect(x, y, w, h, 3).stroke('#ffffff');
  doc.rect(x, y, w, h * 0.25).fill('#4a90e2');
  const ringR = 1.5;
  doc.circle(x + w * 0.25, y + h * 0.15, ringR).fill('#ffffff');
  doc.circle(x + w * 0.75, y + h * 0.15, ringR).fill('#ffffff');
  doc.restore();
}

function drawClockIcon(doc, x, y, size = 16) {
  const r = size / 2;
  const cx = x + r;
  const cy = y + r;
  doc.save();
  doc.lineWidth(1.2);
  doc.circle(cx, cy, r).stroke('#ffffff');
  doc.moveTo(cx, cy);
  doc.lineTo(cx - r * 0.4, cy - r * 0.4).stroke('#ffffff'); // hour hand
  doc.moveTo(cx, cy);
  doc.lineTo(cx, cy - r * 0.7).stroke('#ffffff'); // minute hand
  doc.restore();
}

function drawLocationIcon(doc, x, y, size = 16) {
  const w = size;
  const h = size;
  const centerX = x + w / 2;
  const topY = y;
  doc.save();
  doc.lineWidth(1.2);
  doc.moveTo(centerX, topY + h * 0.1);
  doc.bezierCurveTo(
    centerX + w * 0.5, topY + h * 0.35,
    centerX + w * 0.2, topY + h * 0.9,
    centerX, topY + h
  );
  doc.bezierCurveTo(
    centerX - w * 0.2, topY + h * 0.9,
    centerX - w * 0.5, topY + h * 0.35,
    centerX, topY + h * 0.1
  );
  doc.closePath().stroke('#ffffff');
  doc.circle(centerX, topY + h * 0.45, w * 0.18).fill('#ffffff');
  doc.restore();
}

exports.generateEventTicketPDF = async (req, res) => {
  try {
    const { eventId, attendeeEmail } = req.params;
    const token = req.headers.token;

    if (!eventId || !attendeeEmail) {
      return res.status(400).json({ success: false, message: "Event ID and attendee email are required" });
    }
    if (!token) {
      return res.status(401).json({ success: false, message: "Authentication token required" });
    }

    // Fetch event and attendee (adjust to your ORM/DB)
    const event = await Event.findById(eventId).populate("ticketTypes");
    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }
    const attendee = event.attendees.find(att => att.email === attendeeEmail);
    if (!attendee) {
      return res.status(404).json({ success: false, message: "Attendee not found for this event" });
    }

    const ticketId = `${eventId}-${attendee.name.toLowerCase().replace(/\s+/g, '')}`;
    const eventDate = new Date(event.date);
    const formattedDate = eventDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const eventTime = event.time || "10:00 AM";
    const eventLocation = event.location || "Tech Hub, Bangalore";
    const ticketType = (event.ticketTypes && event.ticketTypes.length > 0)
      ? event.ticketTypes[0].name
      : "General";

    // Generate QR code
    const qrDataUrl = await QRCode.toDataURL(ticketId, { margin: 1, width: 200 });
    const qrBase64 = qrDataUrl.split(',')[1];
    const qrBuffer = Buffer.from(qrBase64, 'base64');

    // Create PDF
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 }
    });

    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(chunks);
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="ticket-${ticketId}.pdf"`,
        'Content-Length': pdfBuffer.length
      });
      res.send(pdfBuffer);
    });

    // Colors
    const bg = '#1f1f23';
    const panelBg = '#2c2c33';
    const accent = '#3366ff';
    const textLight = '#ffffff';
    const muted = '#999999';

    // Draw background
    doc.rect(0, 0, doc.page.width, doc.page.height).fill(bg);

    // Title
    const titleX = 60;
    const titleY = 60;
    doc.font('Helvetica-Bold').fontSize(26).fillColor(textLight).text(event.title, titleX, titleY);

    // ticketType pill aligned right on same line
    const pillText = ticketType.toUpperCase();
    doc.font('Helvetica-Bold').fontSize(10);
    const textWidth = doc.widthOfString(pillText);
    const paddingX = 12;
    const paddingY = 6;
    const pillWidth = textWidth + paddingX * 2;
    const pillHeight = 20;
    const pillX = doc.page.width - 60 - pillWidth;
    const pillY = titleY; // same vertical as title
    doc.roundedRect(pillX, pillY, pillWidth, pillHeight, 10).fill(accent);
    doc.fillColor(textLight).text(pillText, pillX + paddingX, pillY + paddingY - 1, {
      width: textWidth,
      align: 'center',
      lineBreak: false
    });

    // QR code box
    const qrBoxSize = 200;
    const qrBoxX = (doc.page.width - qrBoxSize) / 2;
    const qrBoxY = 140;
    doc.lineWidth(1).strokeColor('#ffffff').rect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize).stroke();
    const innerQrSize = 160;
    doc.image(qrBuffer, qrBoxX + (qrBoxSize - innerQrSize) / 2, qrBoxY + (qrBoxSize - innerQrSize) / 2, {
      width: innerQrSize,
      height: innerQrSize
    });
    doc.fontSize(10).fillColor(muted).text(`QR Code for: ${ticketId}`, qrBoxX, qrBoxY + qrBoxSize + 8, {
      width: qrBoxSize,
      align: 'center'
    });

    // Ticket ID
    doc.moveDown(0.5);
    doc.fontSize(12).fillColor(muted).text(`Ticket ID: ${ticketId}`, { align: 'center' });

    // Event details with increased vertical spacing
    const detailStartY = qrBoxY + qrBoxSize + 60;
    const indent = 80;
    const spacingY = 28;

    // Date
    drawCalendarIcon(doc, indent, detailStartY, 16);
    doc.font('Helvetica').fontSize(14).fillColor(textLight).text(`  ${formattedDate}`, indent + 22, detailStartY + 2);

    // Time
    drawClockIcon(doc, indent, detailStartY + spacingY, 16);
    doc.text(`  ${eventTime}`, indent + 22, detailStartY + spacingY + 2);

    // Location
    drawLocationIcon(doc, indent, detailStartY + spacingY * 2, 16);
    doc.text(`  ${eventLocation}`, indent + 22, detailStartY + spacingY * 2 + 2);

    // Attendee info panel
    const panelY = detailStartY + spacingY * 3 + 40;
    const panelX = 50;
    const panelWidth = doc.page.width - 100;
    const panelHeight = 120;
    doc.roundedRect(panelX, panelY, panelWidth, panelHeight, 8).fill(panelBg);

    const padding = 12;
    let cursorY = panelY + padding;
    doc.font('Helvetica-Bold').fontSize(16).fillColor(textLight).text('Attendee Information', panelX + padding, cursorY);
    cursorY += 24;

    doc.font('Helvetica').fontSize(10).fillColor(muted).text('Name', panelX + padding, cursorY);
    cursorY += 12;
    doc.fontSize(16).fillColor(textLight).text(attendee.name, panelX + padding, cursorY);
    cursorY += 22;
    doc.fontSize(10).fillColor(muted).text('Email', panelX + padding, cursorY);
    cursorY += 12;
    doc.fontSize(16).fillColor(textLight).text(attendee.email, panelX + padding, cursorY);

    // Finish
    doc.end();
  } catch (err) {
    console.error('PDF generation error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteEvent = async(req, res) => {
    try {

        const userId = req.userId;

        const eventId = req.params.eventId;

        const event = await Event.findById(eventId);

        if (!event) {
            return res.status(404).json({
                success: false,
                message: "Event not found"
        })
        }

        if (event.userId !== userId) {
            return res.status(400).json({
                success: false,
                message: "You are not owner of this event."
            })
        }

        await Event.findByIdAndDelete(eventId);

        return res.status(200).json({
            success: true,
            message: "Event deleted successfully"
        })

    } catch(err) {
        return res.status(500).json({
            success: false,
            message: err.message
        })
    }
}

exports.getAttendesUser = async(req,res) => {
    try {

        const eventId = req.params.eventId;

        const event = await Event.findById(eventId);

        if (!event) {
            return res.status(404).json({
                success: false,
                message: "Event not found"
            })
        }

        return res.status(200).json({   
            success: true,
            data : event.attendees
        })

    } catch(err) {
        return res.status(500).json({
            success: false,
            message: err.message
        })
    }
}
