const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/authMiddleware");
const { 
    getNotifications, 
    markNotificationAsRead, 
    markAllNotificationsAsRead 
} = require("../controller/NotificationController");

// Get all notifications for the user
router.get("/", auth, getNotifications);

// Mark a specific notification as read
router.post("/read/:notificationId", auth, markNotificationAsRead);

// Mark all notifications as read
router.post("/read/all", auth, markAllNotificationsAsRead);

module.exports = router;
