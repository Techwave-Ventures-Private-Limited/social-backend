const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/authMiddleware');

const {
    startConversation,
    getConversations,
    getMessageRequests,
    acceptMessageRequest,
    getMessages
} = require('../controller/ConversationController');

// All routes in this file are protected and require authentication
router.use(auth);

// Start a new conversation
router.post('/', startConversation);

// Get all of the user's active conversations
router.get('/', getConversations);

// Get all of the user's pending message requests
router.get('/requests', getMessageRequests);

// Accept a message request
router.post('/requests/:conversationId/accept', acceptMessageRequest);

// Get all messages for a specific conversation
router.get('/:conversationId/messages', getMessages);

module.exports = router;
