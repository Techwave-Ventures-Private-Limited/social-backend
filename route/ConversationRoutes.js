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
    createMessage
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

// router.post('/findOrCreate', auth, async (req, res) => {
//     try {
//         const { recipientId } = req.body;
//         const senderId = req.userId;

//         if (!recipientId) {
//             return res.status(400).json({ message: 'Recipient ID is required.' });
//         }

//         // Search for an existing one-on-one conversation
//         let conversation = await Conversation.findOne({
//             participants: { $all: [senderId, recipientId], $size: 2 }, // Exactly these two participants
//             isGroupChat: false // Ensure it's not a group chat
//         });

//         // If no conversation exists, create one
//         if (!conversation) {
//             conversation = new Conversation({
//                 participants: [senderId, recipientId],
//                 isGroupChat: false
//             });
//             await conversation.save();
//         }

//         // Return the full conversation object, including its ID
//         res.status(200).json({ success: true, body: conversation });

//     } catch (error) {
//         console.error('Error in findOrCreate conversation:', error);
//         res.status(500).json({ message: 'Server error' });
//     }
// });

module.exports = router;
