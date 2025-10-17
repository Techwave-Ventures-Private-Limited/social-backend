const Community = require('../modules/community');
const CommunityPost = require('../modules/post');
const CommunityComment = require('../modules/comments');
const JoinRequest = require('../modules/joinRequest');
const CommunityAnnouncement = require('../modules/communityAnnouncement');
const User = require('../modules/user');
const Post = require('../modules/post');
const Conversation = require('../modules/conversation');
const {
    emitNewCommunityPost,
    emitNewCommunityComment,
    emitCommunityMemberUpdate,
    emitPostModerationAction,
    emitRoleChange
} = require('../utils/communitySocketHelper');
const { uploadVideoToCloudinary, uploadImageToCloudinary } = require("../utils/imageUploader");

// ================================
// COMMUNITY CRUD OPERATIONS
// ================================

// Create a new community
exports.createCommunity = async (req, res) => {
    try {
        const {
            name,
            description,
            tags,
            location,
            isPrivate,
            requiresApproval,
            settings,
            category
        } = req.body;        

        let logo = req.files && req.files.logo;
        let coverImage = req.files && req.files.coverImage;

        const userId = req.userId;

        // Check if community name already exists
        const existingCommunity = await Community.findOne({ 
            name: { $regex: new RegExp(`^${name}$`, 'i') }
        });

        if (existingCommunity) {
            return res.status(400).json({
                success: false,
                message: "Community name already exists"
            });
        }

        // Default settings
        const defaultSettings = {
            allowMemberPosts: true,
            allowMemberEvents: true,
            autoApproveJoins: !requiresApproval,
            allowExternalSharing: true,
            moderationLevel: 'medium',
            welcomeMessage: `Welcome to ${name}! We're excited to have you join our community.`,
            ...settings
        };

        const uploadedLogo = await uploadImageToCloudinary(logo, process.env.FOLDER_NAME || "community");
        const uploadedCoverImage = await uploadImageToCloudinary(coverImage, process.env.FOLDER_NAME || "community");

        const newCommunity = new Community({
            name: name.trim(),
            description,
            coverImage: uploadedCoverImage.secure_url,
            logo: uploadedLogo.secure_url,
            tags: tags || [],
            location,
            owner: userId,
            createdBy: userId,
            isPrivate: isPrivate || false,
            requiresApproval: requiresApproval || false,
            memberCount: 1,
            members: [userId],
            admins: [userId],
            moderators: [],
            settings: defaultSettings,
            category
        });

        await newCommunity.save();

        // --- NEW: Automatically create the group chat ---
        const groupConversation = new Conversation({
            participants: [userId], // Start with the owner
            type: 'group',
            communityId: newCommunity._id,
            initiatedBy: userId,
            status: 'active', // Group chats are active by default
            messagingPermissions: 'members' // Default permission
        });
        await groupConversation.save();

        // --- NEW: Link the conversation back to the community ---
        newCommunity.groupChatId = groupConversation._id;
        await newCommunity.save();

        // Update user's communities (if user schema supports it)
        await User.findByIdAndUpdate(userId, {
            $push: { communities: newCommunity._id }
        });

        // Populate owner info
        await newCommunity.populate('owner', 'name profileImage');

        return res.status(201).json({
            success: true,
            message: "Community and group chat created successfully",
            community: newCommunity
        });

    } catch (error) {
        console.error("Error creating community:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to create community",
            error: error.message
        });
    }
};

// Get all communities with filters
exports.getAllCommunities = async (req, res) => {
    try {
        const {
            search,
            filter = 'all',
            page = 1,
            limit = 20,
            sortBy = 'lastActivity'
        } = req.query;

        const userId = req.user?.id;
        let query = { isDeleted: { $ne: true } };

        // Search functionality
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { tags: { $in: [new RegExp(search, 'i')] } }
            ];
        }

        // Filter logic
        switch (filter) {
            case 'joined':
                if (userId) {
                    query.members = userId;
                }
                break;
            case 'public':
                query.isPrivate = false;
                break;
            case 'private':
                query.isPrivate = true;
                if (userId) {
                    query.members = userId; // Only show private communities user is member of
                }
                break;
            case 'trending':
                // Communities with recent activity
                const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
                query.lastActivity = { $gte: yesterday };
                break;
        }

        // Sorting
        let sortOptions = {};
        switch (sortBy) {
            case 'memberCount':
                sortOptions.memberCount = -1;
                break;
            case 'newest':
                sortOptions.createdAt = -1;
                break;
            case 'name':
                sortOptions.name = 1;
                break;
            default:
                sortOptions.lastActivity = -1;
        }

        const skip = (page - 1) * limit;

        const communities = await Community.find(query)
            .populate('owner', 'name profileImage')
            .populate('members', 'name profileImage')
            .sort(sortOptions)
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        // Add user membership status
        const communitiesWithStatus = communities.map(community => ({
            ...community,
            isUserMember: userId ? community.members.some(member => member._id.toString() === userId) : false,
            userRole: userId ? getUserRoleInCommunity(community, userId) : null
        }));

        const total = await Community.countDocuments(query);

        return res.status(200).json({
            success: true,
            communities: communitiesWithStatus,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalCommunities: total,
                hasNextPage: skip + communities.length < total
            }
        });

    } catch (error) {
        console.error("Error fetching communities:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch communities",
            error: error.message
        });
    }
};

// Get specific community details
exports.getCommunityById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;

        const community = await Community.findById(id)
            .populate('owner', 'name profileImage')
            .populate('members', 'name profileImage')
            .populate('admins', 'name profileImage')
            .populate('moderators', 'name profileImage')
            .populate({
                path: 'posts',
                populate: [
                    { path: 'authorId', select: 'name profileImage' },
                    { path: 'likes', select: 'name' },
                    {
                        path: 'comments',
                        populate: { path: 'userId', select: 'name profileImage' }
                    }
                ],
                options: { sort: { isPinned: -1, createdAt: -1 } }
            })
            .populate({
                path: 'announcements',
                populate: { path: 'createdBy', select: 'name profileImage' },
                options: { sort: { createdAt: -1 } }
            });

        if (!community) {
            return res.status(404).json({
                success: false,
                message: "Community not found"
            });
        }

        // Check if user has access to private community
        if (community.isPrivate && userId && !community.members.some(member => member._id.toString() === userId)) {
            return res.status(403).json({
                success: false,
                message: "Access denied to private community"
            });
        }

        // Add user-specific data
        const communityData = {
            ...community.toObject(),
            isUserMember: userId ? community.members.some(member => member._id.toString() === userId) : false,
            userRole: userId ? getUserRoleInCommunity(community, userId) : null
        };

        return res.status(200).json({
            success: true,
            community: communityData
        });

    } catch (error) {
        console.error("Error fetching community:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch community",
            error: error.message
        });
    }
};

// Update community
exports.updateCommunity = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId;
        const updates = req.body;

        const community = await Community.findById(id);
        if (!community) {
            return res.status(404).json({
                success: false,
                message: "Community not found"
            });
        }

        // Check permissions (only owner and admins can update)
        if (!isOwnerOrAdmin(community, userId)) {
            return res.status(403).json({
                success: false,
                message: "Permission denied"
            });
        }

        // Update community
        Object.assign(community, updates);
        community.lastActivity = new Date();
        await community.save();

        return res.status(200).json({
            success: true,
            message: "Community updated successfully",
            community
        });

    } catch (error) {
        console.error("Error updating community:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to update community",
            error: error.message
        });
    }
};

// Delete community
exports.deleteCommunity = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId;

        const community = await Community.findById(id);
        if (!community) {
            return res.status(404).json({
                success: false,
                message: "Community not found"
            });
        }

        // Only owner can delete community
        if (community.owner.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: "Only community owner can delete the community"
            });
        }

        // Delete all related posts and comments
        await CommunityPost.deleteMany({ communityId: id });
        await CommunityComment.deleteMany({ 
            postId: { $in: community.posts }
        });
        await JoinRequest.deleteMany({ communityId: id });
        await CommunityAnnouncement.deleteMany({ communityId: id });

        // Delete community
        await Community.findByIdAndDelete(id);

        return res.status(200).json({
            success: true,
            message: "Community deleted successfully"
        });

    } catch (error) {
        console.error("Error deleting community:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to delete community",
            error: error.message
        });
    }
};

// ================================
// COMMUNITY MEMBERSHIP OPERATIONS
// ================================

// Join community
exports.joinCommunity = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId;
        const { message } = req.body;

        const community = await Community.findById(id);
        if (!community) {
            return res.status(404).json({
                success: false,
                message: "Community not found"
            });
        }

        // Check if user is banned
        if (community.bannedUsers.includes(userId)) {
            return res.status(403).json({
                success: false,
                message: "You are banned from this community"
            });
        }

        // Check if already a member
        if (community.members.includes(userId)) {
            return res.status(400).json({
                success: false,
                message: "Already a member of this community"
            });
        }

        // Handle join based on community settings
        if (community.requiresApproval) {
            // Create join request
            const user = await User.findById(userId).select('name profileImage');
            
            const joinRequest = new JoinRequest({
                userId,
                userName: user.name,
                userAvatar: user.profileImage,
                communityId: id,
                message: message || null
            });

            await joinRequest.save();
            
            community.joinRequests.push(joinRequest._id);
            await community.save();

            return res.status(200).json({
                success: true,
                message: "Join request submitted successfully",
                requiresApproval: true
            });
        } else {
            // Direct join
            community.members.push(userId);
            community.memberCount += 1;
            community.lastActivity = new Date();
            if (community.groupChatId) {
                await Conversation.findByIdAndUpdate(community.groupChatId, {
                    $addToSet: { participants: userId }
                });
            }
            await community.save();

            return res.status(200).json({
                success: true,
                message: "Joined community successfully",
                requiresApproval: false
            });
        }

    } catch (error) {
        console.error("Error joining community:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to join community",
            error: error.message
        });
    }
};

// Leave community
exports.leaveCommunity = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId;

        const community = await Community.findById(id);
        if (!community) {
            return res.status(404).json({
                success: false,
                message: "Community not found"
            });
        }

        // Owner cannot leave (must transfer ownership first)
        if (community.owner.toString() === userId) {
            return res.status(400).json({
                success: false,
                message: "Community owner cannot leave. Transfer ownership first."
            });
        }

        // Remove from all roles
        community.members = community.members.filter(id => id.toString() !== userId);
        community.admins = community.admins.filter(id => id.toString() !== userId);
        community.moderators = community.moderators.filter(id => id.toString() !== userId);
        community.memberCount = Math.max(0, community.memberCount - 1);
        community.lastActivity = new Date();
        if (community.groupChatId) {
            const userToRemoveId = req.params.memberId || userId; // Get ID based on controller
            await Conversation.findByIdAndUpdate(community.groupChatId, {
                $pull: { participants: userToRemoveId }
            });
        }

        await community.save();

        return res.status(200).json({
            success: true,
            message: "Left community successfully"
        });

    } catch (error) {
        console.error("Error leaving community:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to leave community",
            error: error.message
        });
    }
};

// Get user's joined communities
exports.getUserCommunities = async (req, res) => {
    try {
        const userId = req.userId;

        const communities = await Community.find({
            members: userId,
            isDeleted: { $ne: true }
        })
        .populate('owner', 'name profileImage')
        .sort({ lastActivity: -1 })
        .lean();

        // Add user role for each community
        const communitiesWithRoles = communities.map(community => ({
            ...community,
            userRole: getUserRoleInCommunity(community, userId)
        }));

        return res.status(200).json({
            success: true,
            communities: communitiesWithRoles
        });

    } catch (error) {
        console.error("Error fetching user communities:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch communities",
            error: error.message
        });
    }
};

// ================================
// COMMUNITY POST OPERATIONS
// ================================

// Create a post in community
exports.createCommunityPost = async (req, res) => {
    try {
        const { id } = req.params; // community ID
        let {
            discription,
            type = 'text',
            resourceUrl,
            resourceType,
            videoLink,
            pollOptions = null,
        } = req.body;

        let files = req.files && req.files.images;
        let mediaUrls = [];

        const userId = req.userId;
        if (pollOptions !== null)
            pollOptions = JSON.parse(pollOptions);


        const community = await Community.findById(id);
        if (!community) {
            return res.status(404).json({
                success: false,
                message: "Community not found"
            });
        }

        // Check if user is a member
        if (!community.members.includes(userId)) {
            return res.status(403).json({
                success: false,
                message: "You must be a member to post in this community"
            });
        }

        // Check if member posts are allowed
        if (!community.settings.allowMemberPosts && !isOwnerOrAdmin(community, userId)) {
            return res.status(403).json({
                success: false,
                message: "Only admins can post in this community"
            });
        }

        const user = await User.findById(userId).select('name profileImage');

        if (files) {
            files = Array.isArray(files) ? files : [files];
            for (const file of files) {    
                const isVideo = file.mimetype.startsWith("video");
                if (isVideo) {
                    const uploadedVideo = await uploadVideoToCloudinary(file, process.env.FOLDER_NAME || "post", "auto");
                    mediaUrls.push(uploadedVideo.secure_url);
                }
                else {
                    const uploadedImage = await uploadImageToCloudinary(file, process.env.FOLDER_NAME || "post");
                    mediaUrls.push(uploadedImage.secure_url);
                }
            }
        }

        if (videoLink) {
            mediaUrls.push(videoLink);
        }

        const newPost = new CommunityPost({
            communityId: id,
            authorId: userId,
            authorName: user.name,
            authorAvatar: user.profileImage,
            discription: discription.trim(),
            media: mediaUrls,
            subtype: type,
            type:"Community",
            resourceUrl,
            resourceType,
            postType:"public",
            userId: userId,
            pollOptions
        });

        await newPost.save();

        // Add post to community
        community.posts.push(newPost._id);
        community.lastActivity = new Date();
        await community.save();

        await newPost.populate('authorId', 'name profileImage');

        return res.status(201).json({
            success: true,
            message: "Post created successfully",
            post: newPost
        });

    } catch (error) {
        console.error("Error creating community post:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to create post",
            error: error.message
        });
    }
};

// Get posts for home feed (implements your visibility rules)
exports.getPostsForHomeFeed = async (req, res) => {
    try {
        const userId = req.userId;
        const { page = 1, limit = 20 } = req.query;
        const skip = (page - 1) * limit;

        // Get user's following list and joined communities
        const user = await User.findById(userId).populate('following', '_id');
        const followingIds = user.following.map(f => f._id);

        // Get communities user is member of
        const userCommunities = await Community.find({
            members: userId
        }).select('_id isPrivate');

        const publicCommunityIds = userCommunities
            .filter(c => !c.isPrivate)
            .map(c => c._id);

        // Build query for community posts that should appear in home feed
        let communityPostsQuery = {
            isDeleted: { $ne: true }
        };

        // For public communities: show posts to followers
        // For private communities: don't show in home feed
        if (publicCommunityIds.length > 0) {
            communityPostsQuery.$or = [
                {
                    // Public community posts from communities user is member of
                    communityId: { $in: publicCommunityIds },
                    type: { $ne: 'question' } // Q&A should not appear in home feed
                }
            ];
        } else {
            // If user is not in any public communities, return empty for community posts
            communityPostsQuery = { _id: { $exists: false } };
        }

        // Get community posts for home feed
        const communityPosts = await CommunityPost.find(communityPostsQuery)
            .populate('authorId', 'name profileImage')
            .populate('communityId', 'name logo isPrivate')
            .populate('likes', 'name')
            .populate({
                path: 'comments',
                populate: { path: 'userId', select: 'name profileImage' }
            })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        // Get regular posts from following users
        const regularPosts = await Post.find({
            user: { $in: followingIds },
            postType: 'public'
        })
        .populate('user', 'name profileImage')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

        // Combine and sort all posts by creation date
        const allPosts = [
            ...communityPosts.map(post => ({
                ...post,
                postSource: 'community',
                community: post.communityId
            })),
            ...regularPosts.map(post => ({
                ...post,
                postSource: 'user',
                community: null
            }))
        ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        return res.status(200).json({
            success: true,
            posts: allPosts,
            pagination: {
                currentPage: parseInt(page),
                hasNextPage: allPosts.length === parseInt(limit)
            }
        });

    } catch (error) {
        console.error("Error fetching home feed posts:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch posts",
            error: error.message
        });
    }
};

// Get community posts (for community feed)
exports.getCommunityPosts = async (req, res) => {
    try {
        const { id } = req.params; // community ID
        const {
            type = 'all', // 'all', 'posts', 'questions'
            sortBy = 'best',
            page = 1,
            limit = 20
        } = req.query;

        const userId = req.userId;
        const currentUser = await User.findById(userId);
 
        if (!currentUser) {
            return res.status(400).json({
                success: false,
                message: "User not found"
            })
        }

        const skip = (page - 1) * limit;

        const community = await Community.findById(id);
        if (!community) {
            return res.status(404).json({
                success: false,
                message: "Community not found"
            });
        }

        // Check access for private communities
        if (community.isPrivate && userId && !community.members.includes(userId)) {
            return res.status(403).json({
                success: false,
                message: "Access denied to private community"
            });
        }

        // Build query based on type
        let query = {
            communityId: id,
            isDeleted: { $ne: true }
        };

        switch (type) {
            case 'posts':
                query.type = { $ne: 'question' };
                break;
            case 'questions':
                query.type = 'question';
                break;
            default:
                // 'all' - no additional filter
                break;
        }

        // Build sort options
        let sortOptions = {};
        switch (sortBy) {
            case 'new':
                sortOptions = { createdAt: -1 };
                break;
            case 'top':
                sortOptions = { 'likes.length': -1 };
                break;
            case 'best':
            default:
                // Best = combination of likes and comments with time decay
                sortOptions = { isPinned: -1, createdAt: -1 };
                break;
        }

        const posts = await CommunityPost.find(query)
            .populate('authorId', 'name profileImage')
            .populate('likes', 'name')
            .populate({
                path: 'comments',
                populate: { path: 'userId', select: 'name profileImage' },
                options: { sort: { createdAt: 1 } }
            })
            .sort(sortOptions)
            .skip(skip)
            .limit(parseInt(limit))
            .lean();


        return res.status(200).json({
            success: true,
            posts: posts.map(post => {
                const isBookmarked = currentUser?.savedPost?.some(
                id => id.toString() === post._id.toString()
                ) || false;

                const isLiked = currentUser?.likedPost?.some(
                id => id.toString() === post._id.toString()
                ) || false;

                return {
                ...post.toObject?.() || post, // ensure plain object
                isLiked,
                isBookmarked,
                };
            }),
            pagination: {
                currentPage: parseInt(page),
                hasNextPage: posts.length === parseInt(limit),
            },
            });

    } catch (error) {
        console.error("Error fetching community posts:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch posts",
            error: error.message
        });
    }
};



// Like/Unlike community post
exports.likeCommunityPost = async (req, res) => {
    try {
        const { postId } = req.params;
        const userId = req.userId;

        const user = await User.findById(userId);

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "User does not exists"
            })
        }

        const post = await CommunityPost.findById(postId);
        if (!post) {
            return res.status(404).json({
                success: false,
                message: "Post not found"
            });
        }

        // Check if user has access to the community
        const community = await Community.findById(post.communityId);
        if (community.isPrivate && !community.members.includes(userId)) {
            return res.status(403).json({
                success: false,
                message: "Access denied"
            });
        }

        const hasLiked = post.likes.includes(userId);

        if (hasLiked) {
            post.likes = post.likes.filter(id => id.toString() !== userId);
        } else {
            post.likes.push(userId);
        }

        await post.save();

        if (!user.likedPost.some(id => id.toString() === post._id.toString())) {
            user.likedPost.push(post._id);
            await user.save();
        }

        return res.status(200).json({
            success: true,
            message: hasLiked ? "Post unliked" : "Post liked",
            isLiked: !hasLiked,
            likesCount: post.likes.length
        });

    } catch (error) {
        console.error("Error liking post:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to like post",
            error: error.message
        });
    }
};

// Add comment to community post
exports.addCommentToCommunityPost = async (req, res) => {
    try {
        const { postId } = req.params;
        const { content } = req.body;
        const userId = req.userId;

        const post = await CommunityPost.findById(postId).populate('communityId');
        if (!post) {
            return res.status(404).json({
                success: false,
                message: "Post not found"
            });
        }

        // Check if user has access to the community
        const community = post.communityId;
        if (community.isPrivate && !community.members.includes(userId)) {
            return res.status(403).json({
                success: false,
                message: "Access denied"
            });
        }

        const user = await User.findById(userId).select('name profileImage');

        const newComment = new CommunityComment({
            postId,
            userId: userId,
            text: content.trim()
        });

        await newComment.save();

        // Add comment to post
        post.comments.push(newComment._id);
        
        // If this is a question post, mark as answered
        if (post.type === 'question') {
            post.isAnswered = true;
        }
        
        await post.save();

        // Update community last activity
        await Community.findByIdAndUpdate(community._id, {
            lastActivity: new Date()
        });

        await newComment.populate('userId', 'name profileImage');

        return res.status(201).json({
            success: true,
            message: "Comment added successfully",
            comment: newComment
        });

    } catch (error) {
        console.error("Error adding comment:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to add comment",
            error: error.message
        });
    }
};

// ================================
// MEMBER MANAGEMENT (ADMIN/OWNER)
// ================================

// Manage join requests
exports.handleJoinRequest = async (req, res) => {
    try {
        const { requestId } = req.params;
        const { action } = req.body; // 'approve' or 'reject'
        const userId = req.userId;

        const joinRequest = await JoinRequest.findById(requestId);
        if (!joinRequest) {
            return res.status(404).json({
                success: false,
                message: "Join request not found"
            });
        }

        const community = await Community.findById(joinRequest.communityId);
        if (!isOwnerAdminOrModerator(community, userId)) {
            return res.status(403).json({
                success: false,
                message: "Permission denied"
            });
        }

        if (action === 'approve') {
            // Add user to community
            community.members.push(joinRequest.userId);
            community.memberCount += 1;
            if (community.groupChatId) {
                await Conversation.findByIdAndUpdate(community.groupChatId, {
                    $addToSet: { participants: joinRequest.userId }
                });
            }
            joinRequest.status = 'approved';
        } else if (action === 'reject') {
            joinRequest.status = 'rejected';
        }

        joinRequest.processedBy = userId;
        joinRequest.processedAt = new Date();
        community.lastActivity = new Date();

        await Promise.all([joinRequest.save(), community.save()]);

        return res.status(200).json({
            success: true,
            message: `Join request ${action}d successfully`
        });

    } catch (error) {
        console.error("Error handling join request:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to handle join request",
            error: error.message
        });
    }
};

// Assign role to member
exports.assignRole = async (req, res) => {
    try {
        const { id, memberId } = req.params; // community ID and member ID
        const { role } = req.body; // 'admin' or 'moderator'
        const userId = req.userId;

        const community = await Community.findById(id);
        if (!community) {
            return res.status(404).json({
                success: false,
                message: "Community not found"
            });
        }

        // Only owner and admins can assign roles
        if (!isOwnerOrAdmin(community, userId)) {
            return res.status(403).json({
                success: false,
                message: "Permission denied"
            });
        }

        // Check if target user is a member
        if (!community.members.includes(memberId)) {
            return res.status(400).json({
                success: false,
                message: "User is not a member of this community"
            });
        }

        // Remove from existing role arrays
        community.admins = community.admins.filter(id => id.toString() !== memberId);
        community.moderators = community.moderators.filter(id => id.toString() !== memberId);

        // Add to new role
        if (role === 'admin') {
            community.admins.push(memberId);
        } else if (role === 'moderator') {
            community.moderators.push(memberId);
        }

        community.lastActivity = new Date();
        await community.save();

        return res.status(200).json({
            success: true,
            message: `Role assigned successfully`
        });

    } catch (error) {
        console.error("Error assigning role:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to assign role",
            error: error.message
        });
    }
};

// Remove member from role
exports.removeRole = async (req, res) => {
    try {
        const { id, memberId } = req.params;
        const { userId } = req;

        const community = await Community.findById(id);

        if (!community) {
            return res.status(404).json({ success: false, message: "Community not found" });
        }

        // Only owner and admins can remove roles
        if (community.owner.toString() !== userId && !community.admins.includes(userId)) {
            return res.status(403).json({ success: false, message: "Permission denied" });
        }

        // Use $pull to remove the memberId from both admins and moderators arrays
        await Community.updateOne(
            { _id: id },
            {
                $pull: {
                    admins: memberId,
                    moderators: memberId,
                },
            }
        );

        return res.status(200).json({ success: true, message: "User role removed successfully. The user is now a member." });

    } catch (error) {
        console.error("Error removing role:", error);
        return res.status(500).json({ success: false, message: "Failed to remove role", error: error.message });
    }
};


// Remove member from community
exports.removeMember = async (req, res) => {
    try {
        const { id, memberId } = req.params;
        const userId = req.userId;

        const community = await Community.findById(id);
        if (!community) {
            return res.status(404).json({
                success: false,
                message: "Community not found"
            });
        }

        // Only owner, admins, and moderators can remove members
        if (!isOwnerAdminOrModerator(community, userId)) {
            return res.status(403).json({
                success: false,
                message: "Permission denied"
            });
        }

        // Cannot remove the owner
        if (community.owner.toString() === memberId) {
            return res.status(400).json({
                success: false,
                message: "Cannot remove community owner"
            });
        }

        // Remove from all arrays
        community.members = community.members.filter(id => id.toString() !== memberId);
        community.admins = community.admins.filter(id => id.toString() !== memberId);
        community.moderators = community.moderators.filter(id => id.toString() !== memberId);
        community.memberCount = Math.max(0, community.memberCount - 1);
        community.lastActivity = new Date();
        if (community.groupChatId) {
            const userToRemoveId = req.params.memberId || userId; // Get ID based on controller
            await Conversation.findByIdAndUpdate(community.groupChatId, {
                $pull: { participants: userToRemoveId }
            });
        }
        await community.save();

        return res.status(200).json({
            success: true,
            message: "Member removed successfully"
        });

    } catch (error) {
        console.error("Error removing member:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to remove member",
            error: error.message
        });
    }
};

// ================================
// CONTENT MODERATION
// ================================

// Pin/Unpin post
exports.pinPost = async (req, res) => {
    try {
        const { postId } = req.params;
        const { pin = true } = req.body;
        const userId = req.userId;

        const post = await CommunityPost.findById(postId);
        if (!post) {
            return res.status(404).json({
                success: false,
                message: "Post not found"
            });
        }

        const community = await Community.findById(post.communityId);
        if (!isOwnerAdminOrModerator(community, userId)) {
            return res.status(403).json({
                success: false,
                message: "Permission denied"
            });
        }

        post.isPinned = pin;
        post.pinnedBy = pin ? userId : null;
        post.pinnedAt = pin ? new Date() : null;

        await post.save();

        return res.status(200).json({
            success: true,
            message: pin ? "Post pinned successfully" : "Post unpinned successfully"
        });

    } catch (error) {
        console.error("Error pinning post:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to pin post",
            error: error.message
        });
    }
};

// Delete post
exports.deleteCommunityPost = async (req, res) => {
    try {
        const { postId } = req.params;
        const userId = req.userId;

        const post = await CommunityPost.findById(postId);
        if (!post) {
            return res.status(404).json({
                success: false,
                message: "Post not found"
            });
        }

        const community = await Community.findById(post.communityId);
        
        // Check if user can delete (owner of post or community moderator)
        const canDelete = post.authorId.toString() === userId || 
                         isOwnerAdminOrModerator(community, userId);

        if (!canDelete) {
            return res.status(403).json({
                success: false,
                message: "Permission denied"
            });
        }

        // Soft delete
        post.isDeleted = true;
        post.deletedBy = userId;
        post.deletedAt = new Date();
        await post.save();

        // Remove from community posts array
        community.posts = community.posts.filter(id => id.toString() !== postId);
        await community.save();

        return res.status(200).json({
            success: true,
            message: "Post deleted successfully"
        });

    } catch (error) {
        console.error("Error deleting post:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to delete post",
            error: error.message
        });
    }
};

// ================================
// UTILITY FUNCTIONS
// ================================

function getUserRoleInCommunity(community, userId) {
    if (community.owner.toString() === userId) return 'owner';
    if (community.admins.some(admin => admin._id ? admin._id.toString() === userId : admin.toString() === userId)) return 'admin';
    if (community.moderators.some(mod => mod._id ? mod._id.toString() === userId : mod.toString() === userId)) return 'moderator';
    if (community.members.some(member => member._id ? member._id.toString() === userId : member.toString() === userId)) return 'member';
    return null;
}

function isOwnerOrAdmin(community, userId) {
    return community.owner.toString() === userId || 
           community.admins.some(admin => admin.toString() === userId);
}

function isOwnerAdminOrModerator(community, userId) {
    return community.owner.toString() === userId || 
           community.admins.some(admin => admin.toString() === userId) ||
           community.moderators.some(mod => mod.toString() === userId);
}

exports.getCommunityMembers = async(req,res) => {
    try {

        const userId = req.userId;
        const communityId = req.params.id;

        const community = await Community.findById(communityId).populate("members");
        const user = await User.findById(userId);

        if (!user.communities.includes(communityId)) {
            return res.status(400).json({
                success: false,
                message: "You do not have permission to access this community since you are not a member."
            })
        }

        if (!community) {
            return res.status(400).json({
                success: false,
                message: "Community not found"
            })
        }

        return res.status(200).json({
            success: true,
            members: community.members
        })

    } catch(err) {
        return res.status(500).json({
            success: false,
            message: err.message
        })
    }
}
