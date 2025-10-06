// index.js
// This is the main entry point for the application.

// Load environment variables first
require('dotenv').config();

// --- Core Modules ---
const express = require('express');
const http = require('http'); // Import the http module
const { Server } = require("socket.io"); // Import the Server class from socket.io
const jwt = require('jsonwebtoken'); // You'll need this for auth
const { initializeCommunitySocket } = require('./utils/communitySocketHelper');

// --- App Setup ---
const app = express();
const server = http.createServer(app);


// --- Socket.IO Initialization ---
const io = new Server(server, {
    cors: {
        origin: "*", // Be more specific in production!
        methods: ["GET", "POST"]
    }
});

// --- Socket.IO Real-Time Logic ---
const onlineUsers = new Map(); // Tracks online users: { userId -> socketId }

// Initialize community socket helper
initializeCommunitySocket(io);

// --- Middleware and Config ---
const cookieParser = require("cookie-parser");
const database = require('./config/dbonfig');
const cors = require("cors");
const fileUpload = require("express-fileupload");
const { cloudinaryConnect } = require("./config/cloudinary");
const admin = require('firebase-admin');


// --- Routers ---
const authRouter = require("./route/authRoute");
const userRouter = require("./route/userRoute");
const postRouter = require("./route/postRoute");
const eventRouter = require("./route/eventRoute");
const showcaseRouter = require("./route/showcaseRoute");
const newsRouter = require("./route/newsRoute");
const searchRouter = require("./route/searchRoute");
const notificationRouter = require("./route/notificationRoute");
const conversationRouter = require("./route/ConversationRoutes");
const commentRouter = require("./route/commentRoute");
const communityRouter = require("./route/communityRoute");


// --- Models (needed for socket logic) ---
const User = require('./modules/user');
const Conversation = require('./modules/conversation');
const Message = require('./modules/message');
const Community = require('./modules/community');
const CommunityPost = require('./modules/communityPost');
const CommunityComment = require('./modules/communityComment');
const Like = require('./modules/like');

// --- Database and Cloudinary Connection ---
database.connect();
cloudinaryConnect();

// Ensure unique index for likes collection at startup
(async () => {
    try {
        if (Like && Like.collection && Like.collection.createIndex) {
            await Like.collection.createIndex({ postId: 1, userId: 1 }, { unique: true, name: 'uniq_post_user' });
            console.log('Ensured unique index on likes (postId,userId)');
        }
    } catch (e) {
        console.warn('Could not ensure likes unique index:', e.message);
    }
})();

// Initialize Firebase Admin (conditional)
const path = require('path');
const serviceAccountPath = path.join(__dirname, 'config', 'firebase-service-account.json');
try {
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    console.log('Firebase Admin initialized successfully');
} catch (error) {
    console.warn('Firebase Admin initialization failed:', error.message);
    console.warn('Firebase features will be disabled');
}


// --- Express Middleware ---
const PORT = process.env.PORT;
app.use(express.json());
app.use(cookieParser());
app.use(
    cors({
        origin:"*",
 		credentials:true,
    })
)

app.use(
	fileUpload({
		useTempFiles: true,
		tempFileDir: "/tmp/",
	})
);


// --- MIDDLEWARE TO ATTACH SOCKET.IO TO REQUESTS ---
// This makes `io` and `onlineUsers` available in your controllers (e.g., req.io)
app.use((req, res, next) => {
    req.io = io;
    req.onlineUsers = onlineUsers;
    next();
});

// --- API Route Mounting ---
app.use("/auth", authRouter);
app.use("/user", userRouter);
app.use("/post", postRouter);
app.use("/event", eventRouter);
app.use("/showcase", showcaseRouter);
app.use("/news", newsRouter);
app.use("/search", searchRouter);
app.use("/notification", notificationRouter);
app.use("/conversations", conversationRouter); 
app.use("/comment", commentRouter);
app.use("/community", communityRouter);

// --- Health Check and Root Routes ---
app.use("/hailing",(req,res)=>{
    return res.status(200).json({
        success:true,
        message:"hailing route",
    })
})

app.get("/",(req, res)=>{
    return res.send(`<h1>Working..</h1>`)
})

// Middleware for authenticating socket connections
io.use(async (socket, next) => {
    try {

        console.log("Socket handshake auth:", socket.handshake.auth); // ADD THIS
        const token = socket.handshake.auth.token;
        console.log("Extracted JWT Token:", token); // ADD THIS

        if (!token) {
            return next(new Error('Authentication error: Token is required.'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.id; // Attach userId to the socket object
        next();
    } catch (err) {
        console.error("JWT verification failed:", err);
        next(new Error('Authentication error: Invalid token.'));
    }
});

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.userId} with socket ID: ${socket.id}`);
    onlineUsers.set(socket.userId, socket.id);
    console.log('[DEBUG] onlineUsers map updated:', onlineUsers); // <-- ADD THIS LOG
    socket.join(socket.userId);
    
    // Join community rooms for real-time updates
    socket.on('joinCommunityRooms', async (data) => {
        try {
            const { communityIds } = data;
            if (Array.isArray(communityIds)) {
                communityIds.forEach(communityId => {
                    socket.join(`community_${communityId}`);
                    console.log(`User ${socket.userId} joined community room: community_${communityId}`);
                });
            }
        } catch (err) {
            console.error('Error joining community rooms:', err);
        }
    });
    
    // Leave community room
    socket.on('leaveCommunityRoom', (data) => {
        try {
            const { communityId } = data;
            socket.leave(`community_${communityId}`);
            console.log(`User ${socket.userId} left community room: community_${communityId}`);
        } catch (err) {
            console.error('Error leaving community room:', err);
        }
    });

    // Listen for new messages from a client
    // socket.on('sendMessage', async (data) => {
    //     try {
    //         // 1. Destructure the temporary ID from the client payload
    //         const { conversationId, content, sharedPost, sharedNews, tempId } = data;
            
    //         // Basic validation
    //         if (!conversationId || (!content && !sharedPost && !sharedNews)) {
    //             return socket.emit('error', { message: 'Missing required message data.' });
    //         }

    //         const conversation = await Conversation.findById(conversationId);
    //         if (!conversation || !conversation.participants.includes(socket.userId)) {
    //             return socket.emit('error', { message: 'Cannot send message to this conversation.' });
    //         }

    //         // Create and save the new message
    //         const newMessage = new Message({
    //             conversationId,
    //             sender: socket.userId,
    //             content,
    //             sharedPost,
    //             sharedNews,
    //         });
    //         await newMessage.save();

    //         // Update the conversation's last message
    //         conversation.lastMessage = newMessage._id;
    //         await conversation.save();
            
    //         const populatedMessage = await Message.findById(newMessage._id).populate('sender', 'name profileImage');

    //         // 2. Add the tempId to the message object before broadcasting
    //         const messageToSend = populatedMessage.toObject();
    //         messageToSend.tempId = tempId; // This is the key change

    //         // 3. Broadcast the enhanced message object
    //         conversation.participants.forEach(participantId => {
    //             if (onlineUsers.has(participantId.toString())) {
    //                 io.to(participantId.toString()).emit('newMessage', messageToSend);
    //             }
    //     });
        
    // } catch (err) {
    //     console.error("Error in sendMessage event:", err);
    //     socket.emit('error', { message: 'An error occurred while sending the message.' });
    // }
    // });

    // Handle user disconnection
    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.userId}`);
        onlineUsers.delete(socket.userId);
    });
});


// --- Server Listening ---
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running at ${PORT}`);
});


// The keep-alive service remains unchanged
const axios = require('axios');
function callSelfApi() {
    axios.get('https://social-backend-y1rg.onrender.com/hailing')
        .then(response => {
            console.log('API Response:', response.data);
        })
        .catch(error => {
            console.error('Error calling API:', error.message);
        });

    axios.get('https://newsscrapper-ccsc.onrender.com/hailing')
        .then(response => {
            console.log('API Response:', response.data);
        })
        .catch(error => {
            console.error('Error calling API:', error.message);
        });

    axios.get('https://backend.connektx.com/hailing')
        .then(response => {
            console.log('API Response:', response.data);
        })
        .catch(error => {
            console.error('Error calling API:', error.message);
        });
}

function scheduleApiCall() {
    callSelfApi(); 
    setInterval(callSelfApi, 14 * 60 * 1000);
}

scheduleApiCall();
