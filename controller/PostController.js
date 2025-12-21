const Post = require("../modules/post");
const User = require("../modules/user");
const Comment = require("../modules/comments");
const Community = require("../modules/community");
const CommunityPost = require("../modules/communityPost");
const { createNotification } = require('../utils/notificationUtils');
const { uploadMultipleImagesToCloudinary, uploadVideoToCloudinary, uploadImageToCloudinary } = require("../utils/imageUploader");
const mongoose = require("mongoose");
const CompanyDetails = require("../modules/companyDetails");
const Like = require("../modules/like");
const { addUserData } = require("../controller/UserController");

exports.createPost = async (req, res) => {
    try {

        let { discription, postType, originalPostId, videoLink, pollOptions, resourceUrl, resourceType } = req.body || "";
        const { isReposted } = req.body || false;
        const userId = req.userId;
        // console.log("User request to upload a post", req.body)
        // Accept multiple files (media)
        let files = req.files && req.files.media;
        let mediaUrls = [];

        if (!postType) {
            return res.status(400).json({
                success: false,
                message: "PostType is required"
            })
        }

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

        const user = await User.findById(userId);
        if (!user) {
            return res.status(400).json({
                success: false,
                message: "User does not exists"
            })
        }

        if (pollOptions)
            pollOptions = JSON.parse(pollOptions);

        const createdPost = await Post.create({
            discription,
            media: mediaUrls,
            postType,
            userId,
            user,
            originalPostId,
            isReposted,
            pollOptions,
            resourceUrl,
            resourceType,
            category: user.category
        });
        user.posts.push(createdPost._id);
        await user.save();

        return res.status(200).json({
            success: true,
            message: "Post Created Successfully",
            body: createdPost
        })

    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        })
    }
}

exports.getPost = async (req, res) => {
    try {
        const { postId } = req.params;

        if (!postId) {
            return res.status(400).json({
                success: false,
                message: "PostId required"
            });
        }

        const post = await Post.findById(postId).populate("comments");
        if (!post) {
            return res.status(404).json({
                success: false,
                message: "Post not found"
            });
        }

        // Compute isLiked for the current user (consistent with feed responses)
        let isLiked = false;
        if (req.userId) {
            const like = await Like.find({ userId: req.userId, postId: postId });
            if (like.length > 0) {
                isLiked = true;
            }
        }

        // Return the post plus isLiked without changing the route shape
        const body = { ...(post.toObject ? post.toObject() : post), isLiked };

        return res.status(200).json({
            success: true,
            message: "Post found",
            body
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
}

exports.getUserPosts = async (req, res) => {
    try {

        const userId = req.userId;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "Userid required"
            })
        }

        const posts = await Post.find({ userId: userId });

        return res.status(200).json({
            success: true,
            mesasge: "Post found",
            body: posts
        })

    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        })
    }
}

exports.likePost = async (req, res) => {
    try {

        const postId = req.body.postId;
        const userId = req.userId;
        const ib = req.ib || false;

        // 1. Check if the like already exists to avoid duplicates
        const existingLike = await Like.findOne({ userId, postId });
        if (existingLike) {
            return res.status(400).json({
                success: false,
                message: "Post already liked by this user"
            });
        }

        // 2. Create the like document (the source of truth)
        const newLike = await Like.create({ userId, postId });

        // 3. Atomically increment the likes counter on the Post document
        // This is the key change for scalability.
        const updatedPost = await Post.findByIdAndUpdate(
            postId,
            { $inc: { likes: 1 } },
            { new: true } // This option returns the updated document
        );

        if (!updatedPost) {
            // If the post was deleted in the meantime, clean up the like
            await Like.findByIdAndDelete(newLike._id);
            return res.status(404).json({ success: false, message: "Post not found" });
        }

        if (!ib) {
            await createNotification(updatedPost.userId, userId, 'like', postId);
        }
        // console.log("Post liked:", newLike);

        return res.status(200).json({
            success: true,
            message: "Post liked Successfully",
            body: newLike
        })

    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        })
    }
}

exports.unlikePost = async (req, res) => {
    try {
        const postId = req.body.postId;
        const userId = req.userId;

        // 1. Find and delete the like document
        const deletedLike = await Like.findOneAndDelete({ userId, postId });

        if (!deletedLike) {
            return res.status(400).json({
                success: false,
                message: "Post was not liked by this user"
            });
        }

        // 2. Atomically decrement the likes counter
        let updatedPost = await Post.findByIdAndUpdate(
            postId,
            { $inc: { likes: -1 } },
            { new: true }
        );

        if (!updatedPost) {
            return res.status(404).json({ success: false, message: "Post not found" });
        }

        // --- YOUR RECONCILIATION LOGIC ---
        // 3. Check if the count has gone negative (due to a past sync error)
        if (updatedPost.likes < 0) {

            // Recalculate the true count from the 'likes' collection
            const actualLikeCount = await Like.countDocuments({ postId: postId });

            // Set the count to the correct number
            updatedPost = await Post.findByIdAndUpdate(
                postId,
                { $set: { likes: actualLikeCount } },
                { new: true }
            );
        }

        // console.log("Post unliked:", deletedLike);

        return res.status(200).json({
            success: true,
            message: "Post unliked successfully",
            body: { post: updatedPost }
        });

    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        })
    }
}

exports.commentPost = async (req, res) => {
    try {
        const { postId, text } = req.body;

        if (!postId || !text) {
            return res.json({
                success: false,
                message: "PostId and text required"
            })
        }

        const post = await Post.findById(postId);
        if (!post) {
            return res.status(400).json({
                success: false,
                message: "Post Not found"
            })
        }

        const comment = await Comment.create({ text, postId, userId: req.userId });

        post.comments.push(comment._id);
        await post.save();

        await createNotification(post.userId, req.userId, 'comment', postId);

        return res.status(200).json({
            success: true,
            message: "Comment created ",
            body: comment,
            post: post
        })

    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        })
    }
}

exports.votePoll = async (req, res) => {
    try {
        const { postId } = req.params;
        const { optionId, userId } = req.body;

        if (!optionId || !userId) {
            return res.status(400).json({ message: "optionId and userId are required" });
        }

        // Fetch post
        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }

        // Ensure post has pollOptions
        if (!post.pollOptions || post.pollOptions.length === 0) {
            return res.status(400).json({ message: "This post does not contain a poll" });
        }

        // Find selected option (fixed version using .find)
        const selectedOption = post.pollOptions.find(
            (opt) => opt._id.toString() === optionId
        );

        if (!selectedOption) {
            return res.status(404).json({ message: "Option not found" });
        }

        // Check if user already voted somewhere else
        post.pollOptions.forEach((opt) => {
            const index = opt.votes.indexOf(userId);
            if (index !== -1) opt.votes.splice(index, 1); // remove previous vote
        });

        // Add vote to selected option
        selectedOption.votes.push(userId);

        await post.save();

        return res.status(200).json({
            success: true,
            message: "Vote submitted successfully",
            pollOptions: post.pollOptions
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server error", error: error.message });
    }
};



exports.deleteComment = async (req, res) => {
    try {
        const { commentId } = req.params;
        const userId = req.userId; // From 'auth' middleware

        // 1. Find the comment
        const comment = await Comment.findById(commentId);

        if (!comment) {
            return res.status(404).json({
                success: false,
                message: "Comment not found"
            });
        }

        // 2. Find the parent post to check its author
        const post = await Post.findById(comment.postId);

        if (!post) {
            return res.status(404).json({
                success: false,
                message: "Parent post not found"
            });
        }

        // 3. Authorization Check:
        // Allow deletion if the user is the comment's author OR the post's author
        const isCommentAuthor = comment.userId.toString() === userId;
        const isPostAuthor = post.userId.toString() === userId;

        if (!isCommentAuthor && !isPostAuthor) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized: You cannot delete this comment"
            });
        }

        // 4. Remove the comment reference from the post's 'comments' array
        // We use $pull to remove the specific commentId from the array
        await Post.findByIdAndUpdate(comment.postId, {
            $pull: { comments: commentId }
        });

        // 5. Delete the comment itself
        await Comment.findByIdAndDelete(commentId);

        // (Optional) You might want to delete related notifications here
        // await Notification.deleteMany({ /* criteria for the comment */ });

        return res.status(200).json({
            success: true,
            message: "Comment deleted successfully"
        });

    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

exports.savePost = async (req, res) => {
    try {

        const userId = req.userId;
        const postId = req.body.postId;

        const post = await Post.findById(postId);
        const user = await User.findById(userId);

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "User does not exists"
            })
        }


        if (!post) {
            return res.status(400).json({
                success: false,
                message: "Post does not exists"
            })
        }

        user.savedPost.push(post._id);
        await user.save();

        return res.status(200).json({
            success: true,
            message: "Post saved",
            body: user
        })

    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        })
    }
}

exports.getSavedPost = async (req, res) => {
    try {

        const userId = req.userId;

        const user = await User.findById(userId).populate('savedPost');
        return res.json({
            success: true,
            body: user.savedPost
        })

    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        })
    }
}

exports.getCommentsForPost = async (req, res) => {
    try {
        const { postId } = req.params;

        if (!postId) {
            return res.status(400).json({
                success: false,
                message: "PostId required"
            })
        }

        // Fetch all comments for the post, populate userId
        const comments = await Comment.find({ postId: postId }).populate('userId');

        // Build a map of commentId -> comment for easy lookup
        const commentMap = {};
        comments.forEach(c => { commentMap[c._id] = c; });

        // Helper to recursively format comments with nested replies and author info
        async function formatComment(comment) {
            await comment.populate('replies');
            await comment.populate('userId');
            const user = comment.userId;
            return {
                id: comment._id,
                author: {
                    id: user?._id,
                    name: user?.name,
                    avatar: user?.profileImage || null
                },
                content: comment.text,
                createdAt: comment.createAt ? comment.createAt.toISOString() : new Date().toISOString(),
                likes: comment.likes || 0,
                isLiked: false,
                replies: await Promise.all((comment.replies || []).map(reply => formatComment(reply)))
            };
        }

        // Get only top-level comments (no replyTo)
        const topLevelComments = comments.filter(c => !c.replyTo);

        const formattedComments = await Promise.all(
            topLevelComments.map(comment => formatComment(comment))
        );

        return res.status(200).json({
            success: true,
            message: "Comments found",
            body: formattedComments
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        })
    }
}

exports.getCommentsByUser = async (req, res) => {
    try {
        const userId = req.body.userId || req.userId;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "UserId required"
            });
        }

        const comments = await Comment.find({ userId: userId })
            .populate({
                path: "postId",
                populate: {
                    path: "userId",
                    model: "User",
                    select: "name profileImage"
                }
            })
            .populate("userId", "name profileImage");

        const formatComment = async (comment) => {
            await comment.populate("replies");
            await comment.populate("userId");
            const user = comment.userId;

            // Format post object if it exists
            let postData = null;
            if (comment.postId) {
                const postAuthor = comment.postId.userId;
                postData = {
                    _id: comment.postId._id,
                    content: comment.postId.discription || "",
                    author: {
                        _id: postAuthor?._id || postAuthor,
                        name: postAuthor?.name || "Unknown User",
                        profilePicture: postAuthor?.profileImage || null
                    }
                };
            }

            return {
                id: comment._id,
                post: postData,
                author: {
                    id: user?._id,
                    name: user?.name,
                    avatar: user?.profileImage || null
                },
                content: comment.text,
                createdAt: comment.createAt ? comment.createAt.toISOString() : new Date().toISOString(),
                likes: comment.likes || 0,
                isLiked: false,
                replies: await Promise.all((comment.replies || []).map(reply => formatComment(reply)))
            };
        };

        const formattedComments = await Promise.all(
            comments.map(comment => formatComment(comment))
        );

        return res.status(200).json({
            success: true,
            message: "User comments found",
            body: formattedComments
        });

    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
};


exports.replyToComment = async (req, res) => {
    try {
        const { postId, commentId, content } = req.body;
        const userId = req.userId;

        if (!postId || !commentId || !content) {
            return res.status(400).json({
                success: false,
                message: "postId, commentId, and content are required"
            });
        }

        // Ensure the parent comment exists
        const parentComment = await Comment.findById(commentId);
        if (!parentComment) {
            return res.status(404).json({
                success: false,
                message: "Parent comment not found"
            });
        }

        // Create the reply comment
        const replyComment = await Comment.create({
            text: content,
            postId,
            replyTo: commentId,
            userId: req.userId
        });

        // Add reply to parent's replies array
        parentComment.replies = parentComment.replies || [];
        parentComment.replies.push(replyComment._id);
        await parentComment.save();

        await createNotification(parentComment.userId, userId, 'replyToComment', postId);

        return res.status(200).json({
            success: true,
            message: "Reply created",
            body: replyComment
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
}

exports.getAllPosts = async (req, res) => {
    try {
        const filter = req.query.filter;
        const sortOption = filter == 1 ? { createdAt: -1 } : {};

        // FEATURE FLAG: Control community posts visibility in home feed
        // Set environment variable SHOW_COMMUNITY_POSTS_IN_FEED=true to enable community posts
        // Default: false (community posts hidden from home feed)
        const SHOW_COMMUNITY_POSTS_IN_FEED = process.env.SHOW_COMMUNITY_POSTS_IN_FEED === 'true';

        // Build query to exclude questions and optionally exclude community posts
        const query = { subtype: { $ne: "question" } };

        // If feature flag is disabled, also exclude community posts
        if (!SHOW_COMMUNITY_POSTS_IN_FEED) {
            query.type = { $ne: "Community" };
        }

        let posts = await Post.find(query)
            .sort(sortOption)
            .populate({
                path: 'userId',
                model: 'User',
                populate: [
                    { path: 'about', model: 'About' },
                    { path: 'education', model: 'Education' },
                    { path: 'experience', model: 'Experience' },
                    { path: 'companyDetails', model: 'CompanyDetails' },
                ]
            })
            .populate('comments')
            .populate({
                path: 'originalPostId',
                populate: {
                    path: 'userId',
                    model: 'User',
                    populate: [
                        { path: 'about', model: 'About' },
                        { path: 'education', model: 'Education' },
                        { path: 'experience', model: 'Experience' }
                    ]
                }
            });

        const currentUser = req.userId ? await User.findById(req.userId) : null;

        const formattedPosts = await Promise.all(posts.map(post => formatPost(post, currentUser)));

        return res.status(200).json({
            success: true,
            body: formattedPosts.filter(Boolean)
        });

    } catch (err) {
        console.error('Error in getAllPosts:', err);
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
};


exports.formatPost = async (post, currentUser = null) => {
    if (!post || !post.userId) return null;

    const author = post.userId;
    const about = author.about || {};
    const education = author.education || [];
    const experience = author.experience || [];
    const skills = Array.isArray(about.skills) ? about.skills : [];

    const followers = Array.isArray(author.followers) ? author.followers.length : 0;
    const following = Array.isArray(author.following) ? author.following.length : 0;

    const isFollowing = currentUser?.followers?.some(f => f.toString() === author._id.toString()) || false;
    const isBookmarked = currentUser?.savedPost?.some(id => id.toString() === post._id.toString()) || false;
    //const isLiked = currentUser?.likedPost?.some(id => id.toString() === post._id.toString()) || false;
    const like = await Like.find({ userId: currentUser._id, postId: post._id });
    let isLiked = false;
    if (like.length > 0) {
        isLiked = true;
    }

    // qconst likesCount = await Like.countDocuments({postId : post._id});

    let originalPost = null;
    if (post.originalPostId) {
        originalPost = formatPost(post.originalPostId, currentUser);
    }

    let communityName = "";
    if (post.type === "Community") {
        communityName = post.communityId?.name;
    }

    // Poll aggregation: compute total votes from pollOptions if present
    let pollOptions = undefined;
    let totalVotes = 0;
    if (Array.isArray(post.pollOptions) && post.pollOptions.length > 0) {
        pollOptions = post.pollOptions;
        totalVotes = post.pollOptions.reduce((sum, opt) => {
            const votesArr = Array.isArray(opt.votes) ? opt.votes : [];
            return sum + votesArr.length;
        }, 0);
    }

    return {
        id: post._id,
        author: {
            id: author._id,
            name: author.name,
            username: null,
            email: author.email,
            avatar: author.profileImage || null,
            coverImage: null,
            headline: about.headline || null,
            bio: author.bio || null,
            location: about.location || null,
            website: about.website || null,
            joinedDate: author.createdAt ? author.createdAt.toISOString() : null,
            followers,
            following,
            streak: null,
            lastStoryDate: null,
            isFollowing,
            profileViews: null,
            education,
            experience,
            skills,
            phone: about.phone || null,
            socialLinks: [],
            isCounselor: false,
            counselorInfo: null
        },
        content: post.discription,
        images: post.media || [],
        createdAt: post.createdAt,
        likes: post.likes,
        comments: post.comments?.length || 0,
        isLiked,
        isBookmarked,
        commentsList: post.comments || [],
        originalPost,
        isReposted: post.isReposted,
        type: post.type,
        communityName,
        companyDetails: post.userId.companyDetails,
        // Poll fields for feed consumers
        pollOptions,
        pollOptions,
        totalVotes,
        resourceUrl: post.resourceUrl,
        resourceType: post.resourceType,
        category: post.category
    };
};


// TODO : Remove format post
const formatPost = async (post, currentUser = null) => {
    if (!post || !post.userId) return null;

    const author = post.userId;
    const about = author.about || {};
    const education = author.education || [];
    const experience = author.experience || [];
    const skills = Array.isArray(about.skills) ? about.skills : [];

    const followers = Array.isArray(author.followers) ? author.followers.length : 0;
    const following = Array.isArray(author.following) ? author.following.length : 0;

    const isFollowing = currentUser?.followers?.some(f => f.toString() === author?._id?.toString()) || false;
    const isBookmarked = currentUser?.savedPost?.some(id => id.toString() === post._id.toString()) || false;
    //const isLiked = currentUser?.likedPost?.some(id => id.toString() === post._id.toString()) || false;
    const like = await Like.find({ userId: currentUser._id, postId: post._id });
    let isLiked = false;
    if (like.length > 0) {
        isLiked = true;
    }
    //const likesCount = await Like.countDocuments({postId : post._id});


    let originalPost = null;
    if (post.originalPostId) {
        originalPost = await formatPost(post.originalPostId, currentUser);
    }

    let communityName = "";
    let communityId = "";
    if (post.type === "Community") {
        communityName = post.communityId?.name;
        communityId = post.communityId?._id;
    }

    // Poll aggregation: compute total votes from pollOptions if present
    let pollOptions = undefined;
    let totalVotes = 0;
    if (Array.isArray(post.pollOptions) && post.pollOptions.length > 0) {
        pollOptions = post.pollOptions;
        totalVotes = post.pollOptions.reduce((sum, opt) => {
            const votesArr = Array.isArray(opt.votes) ? opt.votes : [];
            return sum + votesArr.length;
        }, 0);
    }
    //console.log(post.category);
    return {
        id: post._id,
        author: {
            id: author._id,
            name: author.name,
            username: null,
            email: author.email,
            avatar: author.profileImage || null,
            coverImage: null,
            headline: about.headline || null,
            bio: author.bio || null,
            location: about.location || null,
            website: about.website || null,
            joinedDate: author.createdAt ? author.createdAt.toISOString() : null,
            followers,
            following,
            streak: null,
            lastStoryDate: null,
            isFollowing,
            profileViews: null,
            education,
            experience,
            skills,
            phone: about.phone || null,
            socialLinks: [],
            isCounselor: false,
            counselorInfo: null
        },
        content: post.discription,
        images: post.media || [],
        createdAt: post.createdAt,
        likes: post.likes,
        comments: post.comments?.length || 0,
        isLiked,
        isBookmarked,
        commentsList: post.comments || [],
        originalPost,
        isReposted: post.isReposted,
        type: post.type,
        communityName,
        communityId,
        // Poll fields for feed consumers
        pollOptions,
        pollOptions,
        totalVotes,
        resourceUrl: post.resourceUrl,
        resourceType: post.resourceType,
        category: post.category,
    };
};


exports.deletePost = async (req, res) => {
    try {

        const userId = req.userId;
        const postId = req.params.postId;

        const post = await Post.findById(postId);
        if (!post) {
            return res.status(500).json({
                success: false,
                message: "Post not found"
            })
        }

        if (post.userId !== userId) {
            return res.status(401).json({
                success: false,
                message: "User is not owner of the post"
            })
        }

        const user = await User.findById(userId);
        user.posts = user.posts.filter(
            (userPostId) => userPostId.toString() !== postId.toString()
        );
        await user.save();

        await Post.findByIdAndDelete(postId);

        return res.status(200).json({
            success: true,
            message: "Post deleted successfully"
        })

    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        })
    }
}

exports.editPost = async (req, res) => {
    try {
        const userId = req.userId;
        const { postId, discription, postType } = req.body;

        if (!postId) {
            return res.status(400).json({
                success: false,
                message: "PostId is required"
            });
        }

        const post = await Post.findById(postId);

        if (!post) {
            return res.status(404).json({
                success: false,
                message: "Post not found"
            });
        }

        if (post.userId.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to edit this post"
            });
        }

        if (discription !== undefined) post.discription = discription;
        if (postType !== undefined) post.postType = postType;

        let files = req.files && req.files.media;
        let mediaUrls = [];
        if (files) {
            files = Array.isArray(files) ? files : [files];
            for (const file of files) {
                const isVideo = file.mimetype.startsWith("video");
                if (isVideo) {
                    const uploadedVideo = await uploadVideoToCloudinary(file, process.env.FOLDER_NAME || "post", "auto");
                    mediaUrls.push(uploadedVideo.secure_url);
                } else {
                    const uploadedImage = await uploadImageToCloudinary(file, process.env.FOLDER_NAME || "post");
                    mediaUrls.push(uploadedImage.secure_url);
                }
            }
            post.media = mediaUrls;
        }

        await post.save();

        return res.status(200).json({
            success: true,
            message: "Post updated successfully",
            body: post
        });

    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

// ================================
// HOME FEED WITH COMMUNITY POSTS
// ================================

// Get combined home feed (regular posts + community posts based on privacy rules)
exports.getHomeFeedWithCommunities = async (req, res) => {
    try {
        const userId = req.userId;
        const { page = 1, limit = 20, filter = 'latest' } = req.query;
        const skip = (page - 1) * limit;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Authentication required"
            });
        }

        // Get user's following list and joined communities
        const currentUser = await User.findById(userId)
            .populate('following', '_id name profileImage')
            .populate('savedPost')
            .populate('likedPost');

        const followingIds = currentUser.following.map(f => f._id);

        // Get communities user is member of
        const userCommunities = await Community.find({
            members: userId
        }).select('_id isPrivate name logo');

        const publicCommunityIds = userCommunities
            .filter(c => !c.isPrivate)
            .map(c => c._id);

        // Get regular posts from following users
        const regularPostsQuery = {
            userId: { $in: followingIds },
            postType: 'public'
        };

        const regularPosts = await Post.find(regularPostsQuery)
            .populate({
                path: 'userId',
                populate: [
                    { path: 'about', model: 'About' },
                    { path: 'education', model: 'Education' },
                    { path: 'experience', model: 'Experience' }
                ]
            })
            .populate('comments')
            .sort({ createdAt: -1 })
            .lean();

        // FEATURE FLAG: Control community posts visibility in home feed
        // Set environment variable SHOW_COMMUNITY_POSTS_IN_FEED=true to enable community posts
        // Default: false (community posts hidden from home feed)
        const SHOW_COMMUNITY_POSTS_IN_FEED = process.env.SHOW_COMMUNITY_POSTS_IN_FEED === 'true';

        // Get community posts that should appear in home feed
        let communityPosts = [];
        if (SHOW_COMMUNITY_POSTS_IN_FEED && publicCommunityIds.length > 0) {
            communityPosts = await CommunityPost.find({
                communityId: { $in: publicCommunityIds },
                type: { $ne: 'question' }, // Q&A should not appear in home feed
                isDeleted: { $ne: true }
            })
                .populate('authorId', 'name profileImage')
                .populate('communityId', 'name logo isPrivate')
                .populate('likes', 'name')
                .populate({
                    path: 'comments',
                    populate: { path: 'authorId', select: 'name profileImage' }
                })
                .sort({ createdAt: -1 })
                .lean();
        }

        // Format regular posts
        const formattedRegularPosts = regularPosts.map(post => {
            const formatted = formatPost(post, currentUser);
            return {
                ...formatted,
                postSource: 'user',
                community: null
            };
        }).filter(Boolean);

        // Format community posts
        const formattedCommunityPosts = communityPosts.map(post => {
            const author = post.authorId;
            if (!author) return null;

            const isBookmarked = false; // Community posts bookmarking can be implemented later
            const isLiked = post.likes.some(like => like._id?.toString() === userId || like.toString() === userId);

            // Poll aggregation for community posts
            let pollOptions = undefined;
            let totalVotes = 0;
            if (Array.isArray(post.pollOptions) && post.pollOptions.length > 0) {
                pollOptions = post.pollOptions;
                totalVotes = post.pollOptions.reduce((sum, opt) => {
                    const votesArr = Array.isArray(opt.votes) ? opt.votes : [];
                    return sum + votesArr.length;
                }, 0);
            }

            return {
                id: post._id,
                author: {
                    id: author._id,
                    name: author.name,
                    username: null,
                    email: author.email || null,
                    avatar: author.profileImage || null,
                    coverImage: null,
                    headline: null,
                    bio: null,
                    location: null,
                    website: null,
                    joinedDate: null,
                    followers: 0,
                    following: 0,
                    streak: null,
                    lastStoryDate: null,
                    isFollowing: false,
                    profileViews: null,
                    education: [],
                    experience: [],
                    skills: [],
                    phone: null,
                    socialLinks: [],
                    isCounselor: false,
                    counselorInfo: null
                },
                content: post.content,
                images: post.images || [],
                createdAt: post.createdAt,
                likes: post.likes?.length || 0,
                comments: post.comments?.length || 0,
                isLiked,
                isBookmarked,
                commentsList: post.comments || [],
                originalPost: null,
                isReposted: false,
                postSource: 'community',
                community: post.communityId,
                postType: post.type,
                // Poll info for community posts in home feed
                pollOptions,
                totalVotes,
            };
        }).filter(Boolean);

        // Combine and sort all posts by creation date
        const allPosts = [...formattedRegularPosts, ...formattedCommunityPosts]
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(skip, skip + parseInt(limit));

        return res.status(200).json({
            success: true,
            body: allPosts,
            pagination: {
                currentPage: parseInt(page),
                hasNextPage: allPosts.length === parseInt(limit)
            }
        });

    } catch (error) {
        console.error("Error fetching home feed with communities:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch home feed",
            error: error.message
        });
    }
};

// DO NOT CHANGE THIS WITHOUT PERMISSION
// DEPRECATED
exports.getPostsOld = async (req, res) => {
    try {
        return res.status(400).json({
            success: false,
            message: "CONTROLLER IS DEPERECATED"
        })
        const userId = req.userId;
        const limit = parseInt(req.query.limit) || 20;
        const offset = parseInt(req.query.offset) || 0;

        let user = await User.findById(userId);

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "User not found",
            });
        }

        user = await addUserData(user._id);

        const following = user.following || [];
        const followers = user.followers || [];
        const people = [
            ...new Set([
                ...following.map(c => c.following._id.toString()),
                ...followers.map(c => c.follower._id.toString())
            ])
        ];

        const joinedCommunities = user.communities || [];

        /** const likedPosts = (user.likedPost || [])
          .filter(id => mongoose.Types.ObjectId.isValid(id))
          .map(id => new mongoose.Types.ObjectId(id)); */

        const likedPosts = [];

        /** ---------------- MAIN PIPELINE ---------------- */
        let combinedPosts = await Post.aggregate([
            {
                $match: {
                    _id: { $nin: likedPosts },
                    type: "Post",
                    ...(people.length > 0 ? { userId: { $in: people } } : {})
                }
            },
            {
                $unionWith: {
                    coll: "posts",
                    pipeline: [
                        {
                            $match: {
                                _id: { $nin: likedPosts },
                                type: "Community",
                                ...(joinedCommunities.length > 0 ? { communityId: { $in: joinedCommunities } } : { communityId: null })
                            }
                        },
                        {
                            $lookup: {
                                from: "communities",
                                localField: "communityId",
                                foreignField: "_id",
                                as: "communityId"
                            }
                        },
                        { $unwind: { path: "$communityId", preserveNullAndEmptyArrays: true } },
                        {
                            $project: {
                                commentsCount: { $size: { $ifNull: ["$comments", []] } },
                                likes: 1,
                                title: 1,
                                content: 1,
                                userId: 1,
                                originalPostId: 1,
                                createdAt: 1,
                                "communityId._id": 1,
                                "communityId.name": 1,
                                "communityId.logo": 1,
                                "communityId.isPrivate": 1
                            }
                        }
                    ]
                }
            },
            { $addFields: { commentsCount: { $size: { $ifNull: ["$comments", []] } } } },
            { $sort: { likes: -1, commentsCount: -1, createdAt: -1 } },
            { $skip: offset },
            { $limit: limit }
        ]);

        /** ---------------- BACKFILL WITH TRENDING ---------------- */
        if (combinedPosts.length < limit) {
            const remaining = limit - combinedPosts.length;

            const trendingPosts = await Post.aggregate([
                {
                    $match: {
                        _id: { $nin: likedPosts },
                        type: "Post"
                    }
                },
                { $addFields: { commentsCount: { $size: { $ifNull: ["$comments", []] } } } },
                { $sort: { likes: -1, commentsCount: -1, createdAt: -1 } },
                { $limit: remaining }
            ]);
            combinedPosts = [...combinedPosts, ...trendingPosts];
        }

        /** ---------------- POPULATE ---------------- */
        combinedPosts = await Post.populate(combinedPosts, [
            {
                path: "userId",
                model: "User",
                populate: [
                    { path: "about", model: "About" },
                    { path: "education", model: "Education" },
                    { path: "experience", model: "Experience" },
                    { path: 'companyDetails', model: 'CompanyDetails' },
                ],
            },
            { path: "comments" },
            {
                path: "originalPostId",
                populate: {
                    path: "userId",
                    model: "User",
                    populate: [
                        { path: "about", model: "About" },
                        { path: "education", model: "Education" },
                        { path: "experience", model: "Experience" },
                    ],
                },
            },
            {
                path: "communityId",
                model: "Community",
                select: "name logo isPrivate _id"
            }
        ]);

        /** ---------------- FORMAT ---------------- */
        const formattedPosts = await Promise.all(
            combinedPosts.map(post => formatPost(post, user))
        );

        return res.status(200).json({
            success: true,
            body: formattedPosts,
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message,
        });
    }
};


// DO NOT CHANGE THIS WITHOUT PERMISSION
exports.getPostsForTrending = async (req, res) => {
    try {
        const userId = req.userId;
        const limit = parseInt(req.query.limit) || 20;
        const cursor = req.query.cursor ? new Date(req.query.cursor) : null;

        let user = await User.findById(userId);
        if (!user) {
            return res.status(400).json({
                success: false,
                message: "User not found",
            });
        }

        user = await addUserData(user._id);

        const following = user.following || [];
        //const followers = user.followers || [];
        const joinedCommunities = user.communities || [];

        const people = [
            ...new Set([
                ...following.map(c => c.following._id.toString())
            ])
        ];

        const peopleSet = new Set(people);

        // Removed this filter since we don't have that much posts yet
        const likedPosts = [];

        const CANDIDATE_LIMIT = 300;

        const candidateQuery = {
            _id: { $nin: likedPosts },
            $or: [
                { authorId: { $in: people } },
                { communityId: { $in: joinedCommunities } }
            ],
            ...(cursor ? { createdAt: { $lt: cursor } } : {})
        };

        let candidates = await Post.find(candidateQuery)
            .sort({ createdAt: -1 })
            .limit(CANDIDATE_LIMIT)
            .lean();

        candidates.forEach(post => {
            post._score = rankPost(post, user, peopleSet);
        });

        candidates.sort((a, b) => b._score - a._score);

        let finalPosts = candidates.slice(0, limit);

        // filling with trending if candidates are not engouth to reach limit
        if (finalPosts.length < limit) {
            const remaining = limit - finalPosts.length;
            const fetchedIds = finalPosts.map(p => p._id);

            const trending = await Post.find({
                _id: { $nin: [...likedPosts, ...fetchedIds] },
                isDeleted: false,
                ...(cursor ? { createdAt: { $lt: cursor } } : {})
            })
                .sort({ likes: -1, commentsCount: -1, createdAt: -1 })
                .limit(remaining)
                .lean();

            finalPosts = [...finalPosts, ...trending];
        }

        finalPosts = await Post.populate(finalPosts, [
            {
                path: "userId",
                model: "User",
                select: "name profileImage headline _id",
            },
            {
                path: "communityId",
                model: "Community",
                select: "name logo isPrivate _id",
            },
            {
                path: "originalPostId",
                populate: {
                    path: "authorId",
                    model: "User",
                    select: "name profileImage headline _id",
                },
            }
        ]);

        const formattedPosts = await Promise.all(
            finalPosts.map(post => formatPost(post, user))
        );

        return res.status(200).json({
            success: true,
            body: formattedPosts,
            nextCursor:
                formattedPosts.length > 0
                    ? formattedPosts[formattedPosts.length - 1].createdAt
                    : null
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({
            success: false,
            message: err.message,
        });
    }
};

exports.getLatestPosts = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const lastCreatedAt = req.query.cursor || null;

    const query = lastCreatedAt
      ? { createdAt: { $lt: new Date(lastCreatedAt) } }
      : {};

    const posts = await Post.find(query)
      .sort({ createdAt: -1})
      .limit(limit)
      .lean();

    return res.status(200).json({
      success: true,
      body: posts,
      nextCursor: posts.length
        ? posts[posts.length - 1].createdAt
        : null
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};


// private function to calculat posts rank on users homescreen
function rankPost(post, user, people) {
    let score = 0;

    // 1. Same category as user
    if (post.category && post.category === user.category) {
        score += 50;
    }

    // 2. People I follow / followers
    if (post.authorId && people.has(post.authorId.toString())) {
        score += 40;
    }

    // 3. Engagement
    score += (post.likes || 0) * 2;
    score += (post.commentsCount || 0) * 3;

    // 4. Recency decay
    const ageInHours =
        (Date.now() - new Date(post.createdAt)) / 3600000;
    score -= ageInHours * 1.5;

    return score;
}
