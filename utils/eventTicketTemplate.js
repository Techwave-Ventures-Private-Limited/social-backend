const eventTicketTemplate = (eventData) => {
    const {
        eventTitle = "React Native Workshop",
        eventDate = "Friday, December 15, 2023",
        eventTime = "10:00 AM",
        eventLocation = "Tech Hub, Bangalore",
        attendeeName = "Cidesh",
        attendeeEmail = "cidesh@gmail.com",
        ticketId = "e1-cidesh",
        ticketType = "Early Bird",
        qrCodeData = "e1-cidesh"
    } = eventData;

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Event Ticket - ${eventTitle}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background-color: #1a1a1a;
            color: #ffffff;
            line-height: 1.6;
            padding: 20px;
        }

        .ticket-container {
            max-width: 400px;
            margin: 0 auto;
            background-color: #1a1a1a;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }

        .header {
            padding: 24px 20px 16px;
            position: relative;
        }

        .event-title {
            font-size: 24px;
            font-weight: 700;
            color: #ffffff;
            margin-bottom: 8px;
            line-height: 1.2;
        }

        .ticket-type {
            position: absolute;
            top: 20px;
            right: 20px;
            background-color: #007AFF;
            color: #ffffff;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .qr-section {
            padding: 20px;
            text-align: center;
            background-color: #2a2a2a;
            margin: 0 20px;
            border-radius: 12px;
        }

        .qr-code {
            width: 200px;
            height: 200px;
            background-color: #000000;
            border: 2px solid #ffffff;
            margin: 0 auto 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 8px;
            position: relative;
        }

        .qr-code::before {
            content: "QR Code for: " attr(data-qr);
            position: absolute;
            color: #ffffff;
            font-size: 14px;
            text-align: center;
            width: 100%;
        }

        .ticket-id {
            color: #8e8e93;
            font-size: 14px;
            font-weight: 500;
        }

        .event-details {
            padding: 24px 20px;
        }

        .detail-item {
            display: flex;
            align-items: center;
            margin-bottom: 16px;
            padding: 12px 0;
        }

        .detail-icon {
            width: 20px;
            height: 20px;
            margin-right: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #007AFF;
        }

        .detail-icon.calendar::before {
            content: "📅";
            font-size: 16px;
        }

        .detail-icon.clock::before {
            content: "🕐";
            font-size: 16px;
        }

        .detail-icon.location::before {
            content: "📍";
            font-size: 16px;
        }

        .detail-text {
            color: #ffffff;
            font-size: 16px;
            font-weight: 500;
        }

        .attendee-section {
            margin: 0 20px 20px;
            background-color: #2a2a2a;
            border-radius: 12px;
            padding: 20px;
        }

        .attendee-title {
            font-size: 18px;
            font-weight: 700;
            color: #ffffff;
            margin-bottom: 16px;
        }

        .attendee-info {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
        }

        .attendee-info:last-child {
            margin-bottom: 0;
        }

        .attendee-label {
            color: #8e8e93;
            font-size: 14px;
            font-weight: 500;
        }

        .attendee-value {
            color: #ffffff;
            font-size: 14px;
            font-weight: 600;
        }

        @media print {
            body {
                background-color: white;
                color: black;
            }
            
            .ticket-container {
                background-color: white;
                color: black;
                box-shadow: none;
            }
            
            .event-title, .detail-text, .attendee-title, .attendee-value {
                color: black;
            }
            
            .attendee-section, .qr-section {
                background-color: #f5f5f5;
                border: 1px solid #ddd;
            }
            
            .qr-code {
                background-color: white;
                border: 1px solid #000;
            }
            
            .qr-code::before {
                color: black;
            }
        }
    </style>
</head>
<body>
    <div class="ticket-container">
        <div class="header">
            <div class="event-title">${eventTitle}</div>
            <div class="ticket-type">${ticketType}</div>
        </div>

        <div class="qr-section">
            <div class="qr-code" data-qr="${qrCodeData}"></div>
            <div class="ticket-id">Ticket ID: ${ticketId}</div>
        </div>

        <div class="event-details">
            <div class="detail-item">
                <div class="detail-icon calendar"></div>
                <div class="detail-text">${eventDate}</div>
            </div>
            <div class="detail-item">
                <div class="detail-icon clock"></div>
                <div class="detail-text">${eventTime}</div>
            </div>
            <div class="detail-item">
                <div class="detail-icon location"></div>
                <div class="detail-text">${eventLocation}</div>
            </div>
        </div>

        <div class="attendee-section">
            <div class="attendee-title">Attendee Information</div>
            <div class="attendee-info">
                <div class="attendee-label">Name</div>
                <div class="attendee-value">${attendeeName}</div>
            </div>
            <div class="attendee-info">
                <div class="attendee-label">Email</div>
                <div class="attendee-value">${attendeeEmail}</div>
            </div>
        </div>
    </div>
</body>
</html>`;
};

module.exports = { eventTicketTemplate };