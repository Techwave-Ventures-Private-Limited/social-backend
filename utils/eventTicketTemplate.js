const eventTicketTemplate = (ticketData) => {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Event Ticket - ${ticketData.ticketId}</title>
    </head>
    <body style="margin: 0; padding: 20px; font-family: Arial, sans-serif; background-color: #2c2c2c; color: white;">
        <div style="background-color: #2c2c2c; padding: 30px; margin: 0 auto;">
            <div style="margin-bottom: 30px;">
                <div style="font-size: 28px; font-weight: bold; margin-bottom: 15px; color: white;">${ticketData.eventTitle}</div>
                <div style="background-color: #4a90e2; color: white; padding: 8px 16px; font-size: 14px; display: inline-block; margin-bottom: 30px;">${ticketData.ticketType}</div>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <div style="width: 200px; height: 200px; border: 2px solid white; margin: 0 auto 15px auto; display: flex; align-items: center; justify-content: center; background-color: #2c2c2c;">
                    <div style="color: #999; font-size: 14px;">QR Code for: ${ticketData.qrCodeData}</div>
                </div>
            </div>
            
            <div style="color: #999; font-size: 16px; margin: 20px 0; text-align: center;">Ticket ID: ${ticketData.ticketId}</div>
            
            <div style="margin: 30px 0;">
                <div style="margin-bottom: 15px; display: flex; align-items: center;">
                    <div style="width: 20px; height: 20px; margin-right: 15px; color: #4a90e2;">📅</div>
                    <div style="font-size: 18px; color: white;">${ticketData.eventDate}</div>
                </div>
                
                <div style="margin-bottom: 15px; display: flex; align-items: center;">
                    <div style="width: 20px; height: 20px; margin-right: 15px; color: #4a90e2;">🕐</div>
                    <div style="font-size: 18px; color: white;">${ticketData.eventTime}</div>
                </div>
                
                <div style="margin-bottom: 15px; display: flex; align-items: center;">
                    <div style="width: 20px; height: 20px; margin-right: 15px; color: #4a90e2;">📍</div>
                    <div style="font-size: 18px; color: white;">${ticketData.eventLocation}</div>
                </div>
            </div>
            
            <div style="background-color: #3c3c3c; padding: 20px; margin-top: 30px;">
                <div style="font-size: 18px; font-weight: bold; margin-bottom: 15px; color: white;">Attendee Information</div>
                
                <div style="color: #999; font-size: 14px; margin-bottom: 5px;">Name</div>
                <div style="font-size: 18px; color: white; margin-bottom: 15px;">${ticketData.attendeeName}</div>
                
                <div style="color: #999; font-size: 14px; margin-bottom: 5px;">Email</div>
                <div style="font-size: 18px; color: white; margin-bottom: 15px;">${ticketData.attendeeEmail}</div>
            </div>
        </div>
    </body>
    </html>
    `;
};

module.exports = { eventTicketTemplate };