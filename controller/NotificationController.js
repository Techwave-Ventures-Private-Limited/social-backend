const Notification = require('../modules/notification');

// Get all unread and recent read notifications for the logged-in user
exports.getNotifications = async (req, res) => {
    try {
        const userId = req.userId;
        const limit = parseInt(req.query.limit) || 20;
        const offset = parseInt(req.query.offset) || 0;

        const notifications = await Notification.find({ recipient: userId })
            .populate('sender', 'name profileImage') // Populate sender's name and image
            .populate('postId', 'discription media') // Populate post details if available
            .sort({ createdAt: -1 })
            .skip(offset)
            .limit(limit);

        return res.status(200).json({
            success: true,
            message: "Notifications fetched successfully",
            body: notifications,
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message,
        });
    }
};

// Mark a single notification as read
exports.markNotificationAsRead = async (req, res) => {
    try {
        const { notificationId } = req.params;
        const userId = req.userId;

        const notification = await Notification.findOneAndUpdate(
            { _id: notificationId, recipient: userId }, // Ensure user owns the notification
            { read: true },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: "Notification not found or you are not authorized.",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Notification marked as read.",
            body: notification,
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message,
        });
    }
};

// Mark all notifications as read
exports.markAllNotificationsAsRead = async (req, res) => {
    try {
        const userId = req.userId;

        await Notification.updateMany(
            { recipient: userId, read: false },
            { read: true }
        );

        return res.status(200).json({
            success: true,
            message: "All notifications marked as read.",
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message,
        });
    }
};