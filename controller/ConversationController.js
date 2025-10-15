const mongoose = require('mongoose');
const User = require('../modules/user');
const Conversation = require('../modules/conversation');
const Message = require('../modules/message');
const { sendPushNotification } = require('../utils/notificationUtils');

// 1. Start a new conversation or return an existing one
// Replace your existing startConversation function with this more robust version
// exports.startConversation = async (req, res) => {
//     try {
//         const { recipientId } = req.body;
//         const senderId = req.userId;
        
//         if (!recipientId || !mongoose.Types.ObjectId.isValid(recipientId)) {
//             return res.status(400).json({ success: false, message: "Invalid or missing Recipient ID." });
//         }
        
//         const sender = await User.findById(senderId);
//         if (!sender) {
//             return res.status(404).json({ success: false, message: "Authenticated user not found." });
//         }

//         // Check for an existing conversation
//         const existingConversation = await Conversation.findOne({
//             participants: { $all: [senderId, recipientId], $size: 2 }
//         });
        
//         // **NEW**: Handle the rejected case
//         if (existingConversation && existingConversation.status === 'rejected') {
//             const oneMonthAgo = new Date();
//             oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
            
//             // Check if the rejection was less than a month ago
//             if (existingConversation.updatedAt > oneMonthAgo) {
//                 return res.status(403).json({
//                     success: false,
//                     message: "You cannot start a new conversation with this user yet.",
//                 });
//             }
//             // If more than a month has passed, you can proceed to create a new one
//             // by overwriting or deleting the old one. For simplicity, we'll allow a new one.
//         }

//         if (existingConversation && existingConversation.status !== 'rejected') {
//             return res.status(200).json({
//                 success: true,
//                 message: "Conversation already exists.",
//                 body: existingConversation,
//             });
//         }

//         // --- The rest of the function remains the same ---
//         const isFollowing = sender.following.includes(recipientId);
//         const conversationStatus = isFollowing ? 'active' : 'pending';
        
//         const newConversation = new Conversation({
//             participants: [senderId, recipientId],
//             status: conversationStatus,
//             initiatedBy: senderId,
//         });

//         await newConversation.save();
        
//         return res.status(201).json({
//             success: true,
//             message: `Conversation started. Status: ${conversationStatus}`,
//             body: newConversation,
//         });

//     } catch (err) {
//         console.error("💥 [BE FATAL ERROR] The startConversation controller crashed:", err);
//         return res.status(500).json({ 
//             success: false, 
//             message: "An internal server error occurred.",
//             error: err.message
//         });
//     }
// };
exports.startConversation = async (req, res) => {
    try {
        const { recipientId } = req.body;
        const senderId = req.userId;
        
        // console.log(`[BE LOG] startConversation called. Sender: ${senderId}, Recipient: ${recipientId}`);

        // --- FIX 1: Add validation for the recipient's ID ---
        // This prevents crashes if an invalid ID is sent from the client.
        if (!recipientId || !mongoose.Types.ObjectId.isValid(recipientId)) {
            console.error(`[BE ERROR] Invalid or missing recipientId provided: ${recipientId}`);
            return res.status(400).json({ success: false, message: "Invalid or missing Recipient ID." });
        }
        
        // --- FIX 2: Ensure the sender (the logged-in user) exists ---
        // This prevents the server from crashing if the user's token is valid but their account was deleted.
        const sender = await User.findById(senderId);
        if (!sender) {
            console.error(`[BE FATAL] Authenticated sender with ID ${senderId} not found.`);
            return res.status(404).json({ success: false, message: "Authenticated user not found." });
        }

        // Check if a one-on-one conversation between these two users already exists
        const existingConversation = await Conversation.findOne({
            participants: { $all: [senderId, recipientId], $size: 2 },
            type: 'dm'
        });

        if (existingConversation) {
            // console.log(`[BE LOG] Conversation already exists. ID: ${existingConversation._id}`);
            return res.status(200).json({
                success: true,
                message: "Conversation already exists.",
                body: existingConversation,
            });
        }

        // Determine the status based on the follow relationship
        const isFollower = sender.followers.includes(recipientId);
        const conversationStatus = isFollower ? 'active' : 'pending';
        // console.log(`[BE LOG] Follow status: ${isFollower}. New conversation status: ${conversationStatus}`);
        
        const newConversation = new Conversation({
            participants: [senderId, recipientId],
            status: conversationStatus,
            initiatedBy: senderId,
            type: 'dm',
        });

        await newConversation.save();
        // console.log(`[BE LOG] Successfully created new conversation. ID: ${newConversation._id}`);

        return res.status(201).json({
            success: true,
            message: `Conversation started. Status: ${conversationStatus}`,
            body: newConversation,
        });

    } catch (err) {
        // --- FIX 3: Improved catch block to handle ANY other errors ---
        // This will catch any unexpected database errors and prevent a server crash.
        console.error("💥 [BE FATAL ERROR] The startConversation controller crashed:", err);
        return res.status(500).json({ 
            success: false, 
            message: "An internal server error occurred while starting the conversation.",
            error: err.message // Send the actual error message back for easier debugging
        });
    }
};

// 2. Get all active conversations for the logged-in user
// exports.getConversations = async (req, res) => {
//     try {
//         const userId = req.userId;

//         const conversations = await Conversation.find({ participants: userId, status: 'active' })
//             .populate({
//                 path: 'participants',
//                 select: 'name profileImage' // Select fields to return
//             })
//             .populate({
//                 path: 'lastMessage',
//                 populate: {
//                     path: 'sender',
//                     select: 'name'
//                 }
//             })
//             .sort({ updatedAt: -1 });

//         // Filter out the current user from the participants list before sending
//         const finalConversations = conversations.map(convo => {
//             const conversationObject = convo.toObject();
//             conversationObject.participants = conversationObject.participants.filter(p => p._id.toString() !== userId);
//             return conversationObject;
//         });

//         return res.status(200).json({
//             success: true,
//             message: "Active conversations fetched successfully.",
//             body: finalConversations,
//         });

//     } catch (err) {
//         return res.status(500).json({ success: false, message: err.message });
//     }
// };


// 2. Get all conversations (active and pending) for the logged-in user
exports.getConversations = async (req, res) => {
    try {
        const userId = req.userId;

        // **FIX**: Removed the `status: 'active'` filter to fetch ALL conversations (active and pending)
        const conversations = await Conversation.find({ participants: userId, status: { $ne: 'rejected' }, type: 'dm' })
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
            message: "All conversations fetched successfully.",
            body: finalConversations,
        });

    } catch (err) {
        console.error("💥 [BE FATAL ERROR] The getConversations controller crashed:", err);
        return res.status(500).json({ 
            success: false, 
            message: "An internal server error occurred.",
            error: err.message
        });
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
// exports.getMessages = async (req, res) => {
//     try {
//         const { conversationId } = req.params;
//         const userId = req.userId;
//         const { page = 1, limit = 20 } = req.query;

//         // Ensure user is part of the conversation
//         const conversation = await Conversation.findOne({ _id: conversationId, participants: userId });
//         if (!conversation) {
//             return res.status(403).json({ success: false, message: "You are not a member of this conversation." });
//         }

//         const messages = await Message.find({ conversationId: conversationId })
//             .populate('sender', 'name profileImage')
//             .populate('sharedPost') // Populates the full post document if shared
//             .populate('sharedNews') // Populates the full news document if shared
//             .sort({ createdAt: -1 })
//             .limit(limit * 1)
//             .skip((page - 1) * limit);

//         // Reverse to show oldest messages first in the chat window
//         messages.reverse();
        
//         const count = await Message.countDocuments({ conversationId });


//         return res.status(200).json({
//             success: true,
//             message: "Messages fetched successfully.",
//             body: {
//                 messages,
//                 conversationStatus: conversation.status,
//                 initiatedBy: conversation.initiatedBy,
//                 totalPages: Math.ceil(count / limit),
//                 currentPage: parseInt(page)
//             },
//         });
//     } catch (err) {
//         return res.status(500).json({ success: false, message: err.message });
//     }
// };


// 6. Create a new message in a conversation
// exports.createMessage = async (req, res) => {
//     try {
//         const { conversationId } = req.params;
//         const senderId = req.userId;

//         // Get the message content from the request body
//         const { content, sharedPostId, sharedNewsId } = req.body;

//         // Basic validation
//         if (!content && !sharedPostId && !sharedNewsId) {
//             return res.status(400).json({ success: false, message: "Message cannot be empty." });
//         }

//         // Create the new message document
//         const newMessage = await Message.create({
//             conversationId,
//             sender: senderId,
//             content: content || '', // Default to empty string if not provided
//             sharedPost: sharedPostId || null,
//             sharedNews: sharedNewsId || null,
//             readBy: [senderId] // The sender has "read" their own message
//         });

//         // Update the parent conversation with the last message and timestamp
//         await Conversation.findByIdAndUpdate(conversationId, {
//             lastMessage: newMessage._id,
//             updatedAt: Date.now()
//         });

//         // Populate the sender info for the socket event
//         const populatedMessage = await Message.findById(newMessage._id).populate('sender', 'name profileImage');

//         // You should emit a socket event here to notify other users in real-time
//         // E.g., io.to(conversationId).emit('newMessage', populatedMessage);

//         return res.status(201).json({
//             success: true,
//             message: "Message sent successfully.",
//             body: populatedMessage
//         });

//     } catch (err) {
//         console.error("💥 [BE FATAL ERROR] The createMessage controller crashed:", err);
//         return res.status(500).json({ success: false, message: "Failed to send message.", error: err.message });
//     }
// };




// 5. Get all messages for a specific conversation
exports.getMessages = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.userId;
        const { page = 1, limit = 20 } = req.query;

        const conversation = await Conversation.findOne({ _id: conversationId, participants: userId });
        if (!conversation) {
            return res.status(403).json({ success: false, message: "You are not a member of this conversation." });
        }

        const messages = await Message.find({ conversationId: conversationId })
            .populate('sender', 'name profileImage')
            .populate('sharedPost')
            .populate('sharedNews')
            .populate('sharedUser', 'name profileImage bio') 
            .populate('sharedShowcase', 'projectTitle logo tagline')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        messages.reverse();
        
        const count = await Message.countDocuments({ conversationId });

        return res.status(200).json({
            success: true,
            message: "Messages fetched successfully.",
            body: {
                messages,
                conversationStatus: conversation.status,
                initiatedBy: conversation.initiatedBy,
                totalPages: Math.ceil(count / limit),
                currentPage: parseInt(page)
            },
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

// 6. Create a new message in a conversation (UPDATED)
// exports.createMessage = async (req, res) => {
//     try {
//         const { conversationId } = req.params;
//         const senderId = req.userId;

//         // --- NEW: Destructure new shared item IDs from the body ---
//         const { content, sharedPostId, sharedNewsId, sharedUserId, sharedShowcaseId } = req.body;

//         // --- NEW: Updated validation to include new shared types ---
//         if (!content && !sharedPostId && !sharedNewsId && !sharedUserId && !sharedShowcaseId) {
//             return res.status(400).json({ success: false, message: "Message content cannot be empty." });
//         }

//         // --- NEW: Create message object with the new schema structure ---
//         const newMessage = await Message.create({
//             conversationId,
//             sender: senderId,
//             content: content || null,
//             sharedPost: sharedPostId || null,
//             sharedNews: sharedNewsId || null,
//             sharedUser: sharedUserId || null,
//             sharedShowcase: sharedShowcaseId || null,
//             readBy: [{ user: senderId, seenAt: new Date() }]
//         });

//         await Conversation.findByIdAndUpdate(conversationId, {
//             lastMessage: newMessage._id,
//         });

//         // --- NEW: Populate all possible shared item types ---
//         const populatedMessage = await Message.findById(newMessage._id)
//             .populate('sender', 'name profileImage')
//             .populate('sharedPost')
//             .populate('sharedNews')
//             .populate('sharedUser', 'name profileImage bio')
//             .populate('sharedShowcase', 'projectTitle logo tagline');

//         // You should emit a socket event here to notify other users in real-time
//         // E.g., io.to(conversationId).emit('newMessage', populatedMessage);

//         return res.status(201).json({
//             success: true,
//             message: "Message sent successfully.",
//             body: populatedMessage
//         });

//     } catch (err) {
//         console.error("💥 [BE FATAL ERROR] The createMessage controller crashed:", err);
//         return res.status(500).json({ success: false, message: "Failed to send message.", error: err.message });
//     }
// };

// 6. Create a new message in a conversation (UPDATED with Real-Time Logic)
exports.createMessage = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const senderId = req.userId;

        // --- Destructure shared item IDs from the body ---
        const { content, sharedPostId, sharedNewsId, sharedUserId, sharedShowcaseId } = req.body;
        
        // --- Get io and onlineUsers from the request object ---
        const { io, onlineUsers } = req;
        // console.log('[DEBUG] onlineUsers map in controller:', onlineUsers); // <-- ADD THIS LOG


        // --- Updated validation to include new shared types ---
        if (!content && !sharedPostId && !sharedNewsId && !sharedUserId && !sharedShowcaseId) {
            return res.status(400).json({ success: false, message: "Message content cannot be empty." });
        }

        // --- Create message object with the new schema structure ---
        const newMessage = await Message.create({
            conversationId,
            sender: senderId,
            content: content || null,
            sharedPost: sharedPostId || null,
            sharedNews: sharedNewsId || null,
            sharedUser: sharedUserId || null,
            sharedShowcase: sharedShowcaseId || null,
            readBy: [{ user: senderId, seenAt: new Date() }]
        });

        // Find the conversation to get all participants and update the last message
        const conversation = await Conversation.findByIdAndUpdate(conversationId, {
            lastMessage: newMessage._id,
        });

        if (conversation.type === 'group' && conversation.messagingPermissions === 'admins_only') {
            const community = await Community.findById(conversation.communityId);
            const isOwner = community.owner.toString() === senderId;
            const isAdmin = community.admins.map(id => id.toString()).includes(senderId);
            const isModerator = community.moderators.map(id => id.toString()).includes(senderId);

            if (!isOwner && !isAdmin && !isModerator) {
                return res.status(403).json({ 
                    success: false, 
                    message: "Only admins and moderators can send messages in this chat." 
                });
            }
        }

        // --- Populate all possible shared item types for the broadcast ---
        const populatedMessage = await Message.findById(newMessage._id)
            .populate('sender', 'name profileImage')
            .populate('sharedPost')
            .populate('sharedNews')
            .populate('sharedUser', 'name profileImage bio')
            .populate('sharedShowcase', 'projectTitle logo tagline');

        // --- REAL-TIME BROADCAST LOGIC ---
        // --- 4. Broadcast Logic (Real-time & Push Notifications) ---
        if (conversation && populatedMessage) {
            const senderName = populatedMessage.sender?.name || 'Someone';

            for (const participantId of conversation.participants) {
                if (participantId.toString() === senderId) continue;

                if (req.onlineUsers.has(participantId.toString())) {
                // ONLINE: in-app realtime only
                const participantSocketId = req.onlineUsers.get(participantId.toString());
                req.io.to(participantSocketId).emit('newMessage', populatedMessage.toObject());
                } else {
                // OFFLINE: Expo push only, no in-app Notification doc
                await sendPushNotification(
                    participantId,
                    `New message from ${senderName}`,
                    populatedMessage.content || 'Sent you an Message',
                    {
                    type: 'new_message',
                    conversationId: conversation._id.toString(),
                    senderId: senderId.toString(),
                    messageId: populatedMessage._id.toString()
                    }
                );
                }
            }
        }
        // --- END OF REAL-TIME LOGIC ---

        return res.status(201).json({
            success: true,
            message: "Message sent successfully.",
            body: populatedMessage
        });

    } catch (err) {
        console.error("💥 [BE FATAL ERROR] The createMessage controller crashed:", err);
        return res.status(500).json({ success: false, message: "Failed to send message.", error: err.message });
    }
};

// 7. Mark messages in a conversation as seen (NEW)
exports.markMessagesAsSeen = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.userId;
        const { io, onlineUsers } = req; // Get socket instances from the request

        // Find all messages in the conversation that the user has not yet read
        // and update them by adding the user to the 'readBy' array.
        const result = await Message.updateMany(
            {
                conversationId: conversationId,
                // Ensure the user is not the sender
                sender: { $ne: userId }, 
                // Ensure the user is not already in the readBy array
                'readBy.user': { $ne: userId }
            },
            {
                // Add the current user and timestamp to the 'readBy' array
                $addToSet: { readBy: { user: userId, seenAt: new Date() } }
            }
        );

        if (result.nModified > 0) {
            const conversation = await Conversation.findById(conversationId);
            if (conversation) {
                // Find all other participants in the conversation
                conversation.participants.forEach(participantId => {
                    // Don't send a notification to the person who just read the messages
                    if (participantId.toString() !== userId) {
                        // Check if the other participant is online
                        if (onlineUsers.has(participantId.toString())) {
                            const participantSocketId = onlineUsers.get(participantId.toString());
                            // Emit a specific event to the other participant
                            io.to(participantSocketId).emit('messagesSeen', {
                                conversationId,
                                readerId: userId 
                            });
                        }
                    }
                });
            }
        }
        
        return res.status(200).json({
            success: true,
            message: "Messages marked as seen.",
            body: {
                modifiedCount: result.nModified
            }
        });

    } catch (err) {
        console.error("💥 [BE FATAL ERROR] The markMessagesAsSeen controller crashed:", err);
        return res.status(500).json({ success: false, message: "Failed to update seen status.", error: err.message });
    }
};


// 8. UPDATED REJECT FUNCTION
exports.rejectMessageRequest = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.userId;

        const updatedConversation = await Conversation.findOneAndUpdate(
            { 
                _id: conversationId, 
                participants: userId, 
                status: 'pending' 
            },
            { 
                status: 'rejected', 
                rejectedBy: userId,
                // `updatedAt` is automatically handled by `timestamps: true`
            },
            { new: true } // Return the updated document
        );

        if (!updatedConversation) {
            return res.status(404).json({ 
                success: false, 
                message: "Request not found or you are not authorized to reject it." 
            });
        }

        return res.status(200).json({
            success: true,
            message: "Message request has been rejected.",
            body: updatedConversation
        });

    } catch (err) {
        console.error("💥 [BE FATAL ERROR] The rejectMessageRequest controller crashed:", err);
        return res.status(500).json({ 
            success: false, 
            message: "An internal server error occurred.",
            error: err.message
        });
    }
};