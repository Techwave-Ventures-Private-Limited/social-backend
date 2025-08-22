const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/authMiddleware');

// Import all your controller functions
const {
    startConversation,
    getConversations,
    getMessageRequests,
    acceptMessageRequest,
    getMessages,
    createMessage,
    markMessagesAsSeen
} = require('../controller/ConversationController');

// Apply authentication middleware to all routes in this file
router.use(auth);

// --- UNIFIED ROUTES ---

// POST /conversations/ -> Starts a new conversation (or returns existing)
router.post('/', startConversation);

// GET /conversations/ -> Gets all of the user's active conversations
router.get('/', getConversations);

// GET /conversations/requests -> Gets all pending message requests
router.get('/requests', getMessageRequests);

// POST /conversations/requests/:conversationId/accept -> Accepts a request
router.post('/requests/:conversationId/accept', acceptMessageRequest);

// GET /conversations/:conversationId/messages -> Gets messages for one chat
router.get('/:conversationId/messages', getMessages);

// POST /conversations/:conversationId/messages -> Creates a new message in a conversation
router.post('/:conversationId/messages', createMessage);

// POST /conversations/:conversationId/seen -> Marks messages as seen
router.post('/:conversationId/seen', markMessagesAsSeen);

module.exports = router;
