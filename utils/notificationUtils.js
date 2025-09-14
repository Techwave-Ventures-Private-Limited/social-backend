const fetch = require('node-fetch');
const Notification = require('../modules/notification');
const User = require('../modules/user');

/**
 * Sends a push notification to a user's devices via the Expo Push Notification Service.
 */
const sendPushNotification = async (recipientId, title, body, data = {}) => {
    try {
        const user = await User.findById(recipientId);

        if (!user || !user.deviceTokens || user.deviceTokens.length === 0) {
            // console.log("Push notification not sent: User has no registered device tokens.");
            return;
        }

        const validTokens = user.deviceTokens.filter(token => typeof token === 'string' && token.startsWith('ExponentPushToken'));

        if (validTokens.length === 0) {
            // console.log("Push notification not sent: No valid ExpoPushTokens found for user.");
            return;
        }
        
        const message = {
            to: validTokens,
            sound: 'default',
            title: title,
            body: body,
            data: data,
        };

        // console.log('Sending notification via Expo Push Service with payload:', JSON.stringify(message, null, 2));

        // This fetch call will now work because you imported it at the top of the file.
        await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Accept-encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(message),
        });

        // console.log('Push notification request sent to Expo successfully.');

    } catch (error) {
        console.error('Error sending push notification via Expo service:', error);
    }
};

/**
 * Creates an in-app notification and triggers a push notification.
 */
exports.createNotification = async (recipient, sender, type, postId = null) => {
    try {
        if (recipient.toString() === sender.toString()) return;

        const senderUser = await User.findById(sender).select('name');
        if (!senderUser) {
            console.error("Notification not created: Sender not found.");
            return;
        }

        let message = '';
        let title = 'New Notification';
        let pushData = { notificationType: type, senderId: sender.toString() };

        switch (type) {
            case 'like':
                title = 'New Like';
                message = `${senderUser.name} liked your post.`;
                if(postId) pushData.postId = postId.toString();
                break;
            case 'comment':
                title = 'New Comment';
                message = `${senderUser.name} commented on your post.`;
                if(postId) pushData.postId = postId.toString();
                break;
            case 'follow':
                title = 'New Follower';
                message = `${senderUser.name} started following you.`;
                break;
            // Add other cases as needed
        }

        const inAppNotification = new Notification({ recipient, sender, type, message, postId });
        await inAppNotification.save();
        // console.log("In-app notification created successfully.");

        await sendPushNotification(recipient, title, message, pushData);

    } catch (error) {
        console.error("Error creating notification:", error);
    }
};