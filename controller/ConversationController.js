const User = require('../modules/user');
const Conversation = require('../modules/Conversation');
const Message = require('../modules/Message');

// 1. Start a new conversation or return an existing one
exports.startConversation = async (req, res) => {
    try {
        const { recipientId } = req.body;
        const senderId = req.userId;

        if (!recipientId) {
            return res.status(400).json({ success: false, message: "Recipient ID is required." });
        }
        
        // Check if a conversation between these two users already exists
        const existingConversation = await Conversation.findOne({
            participants: { $all: [senderId, recipientId] }
        });

        if (existingConversation) {
            return res.status(200).json({
                success: true,
                message: "Conversation already exists.",
                body: existingConversation,
            });
        }

        // Determine the status based on follow relationship
        const sender = await User.findById(senderId);
        const isFollowing = sender.following.includes(recipientId);
        
        const conversationStatus = isFollowing ? 'active' : 'pending';

        const newConversation = new Conversation({
            participants: [senderId, recipientId],
            status: conversationStatus,
            initiatedBy: senderId,
        });

        await newConversation.save();

        return res.status(201).json({
            success: true,
            message: `Conversation started. Status: ${conversationStatus}`,
            body: newConversation,
        });

    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

// 2. Get all active conversations for the logged-in user
exports.getConversations = async (req, res) => {
    try {
        const userId = req.userId;

        const conversations = await Conversation.find({ participants: userId, status: 'active' })
            .populate({
                path: 'participants',
                select: 'name profileImage' // Select fields to return
            })
            .populate({
                path: 'lastMessage',
                populate: {
                    path: 'sender',
                    select: 'name'
                }
            })
            .sort({ updatedAt: -1 });

        // Filter out the current user from the participants list before sending
        const finalConversations = conversations.map(convo => {
            const conversationObject = convo.toObject();
            conversationObject.participants = conversationObject.participants.filter(p => p._id.toString() !== userId);
            return conversationObject;
        });

        return res.status(200).json({
            success: true,
            message: "Active conversations fetched successfully.",
            body: finalConversations,
        });

    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

// 3. Get all pending message requests for the user
exports.getMessageRequests = async (req, res) => {
    try {
        const userId = req.userId;

        const requests = await Conversation.find({
            participants: userId,
            status: 'pending',
            initiatedBy: { $ne: userId } // Only show requests initiated by others
        }).populate('participants', 'name profileImage').sort({ createdAt: -1 });
        
        const finalRequests = requests.map(req => {
            const requestObject = req.toObject();
            requestObject.participants = requestObject.participants.filter(p => p._id.toString() !== userId);
            return requestObject;
        });


        return res.status(200).json({
            success: true,
            message: "Message requests fetched successfully.",
            body: finalRequests,
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};


// 4. Accept a pending message request
exports.acceptMessageRequest = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.userId;

        const conversation = await Conversation.findOneAndUpdate(
            { _id: conversationId, participants: userId, status: 'pending' },
            { status: 'active' },
            { new: true }
        );

        if (!conversation) {
            return res.status(404).json({ success: false, message: "Request not found or you are not authorized to accept it." });
        }

        // You would emit a socket event here to notify the other user
        // E.g., io.to(otherUserId).emit('requestAccepted', conversation);

        return res.status(200).json({
            success: true,
            message: "Message request accepted.",
            body: conversation,
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

// 5. Get all messages for a specific conversation
exports.getMessages = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.userId;
        const { page = 1, limit = 20 } = req.query;

        // Ensure user is part of the conversation
        const conversation = await Conversation.findOne({ _id: conversationId, participants: userId });
        if (!conversation) {
            return res.status(403).json({ success: false, message: "You are not a member of this conversation." });
        }

        const messages = await Message.find({ conversationId: conversationId })
            .populate('sender', 'name profileImage')
            .populate('sharedPost') // Populates the full post document if shared
            .populate('sharedNews') // Populates the full news document if shared
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        // Reverse to show oldest messages first in the chat window
        messages.reverse();
        
        const count = await Message.countDocuments({ conversationId });


        return res.status(200).json({
            success: true,
            message: "Messages fetched successfully.",
            body: {
                messages,
                totalPages: Math.ceil(count / limit),
                currentPage: parseInt(page)
            },
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};
