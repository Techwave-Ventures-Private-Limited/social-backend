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

router.post('/findOrCreate', authMiddleware, async (req, res) => {
    try {
        const { recipientId } = req.body;
        const senderId = req.user.id;

        if (!recipientId) {
            return res.status(400).json({ message: 'Recipient ID is required.' });
        }

        // Search for an existing one-on-one conversation
        let conversation = await Conversation.findOne({
            participants: { $all: [senderId, recipientId], $size: 2 }, // Exactly these two participants
            isGroupChat: false // Ensure it's not a group chat
        });

        // If no conversation exists, create one
        if (!conversation) {
            conversation = new Conversation({
                participants: [senderId, recipientId],
                isGroupChat: false
            });
            await conversation.save();
        }

        // Return the full conversation object, including its ID
        res.status(200).json({ success: true, body: conversation });

    } catch (error) {
        console.error('Error in findOrCreate conversation:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
