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

exports.createPost = async (req, res) => {
    try {

        let { discription, postType, originalPostId, videoLink, pollOptions  = null} = req.body || "";
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

        if (pollOptions !== null)
            pollOptions = JSON.parse(pollOptions);
        
        const createdPost = await Post.create({
            discription,
            media: mediaUrls,
            postType,
            userId,
            user,
            originalPostId,
            isReposted,
            pollOptions
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
            const like = await Like.find({userId : req.userId});
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
        const post = await Post.findById(postId);

        const userId = req.userId;
        const user = await User.findById(userId);

        if (!userId) {
            return res.status(400).json({
                success:false,
                message:"User not found"
            })
        }

        if (!post) {
            return res.status(400).json({
                success: false,
                message: "Post not found"
            })
        }

        // if (!user.likedPost.some(id => id.toString() === post._id.toString())) {
        //     user.likedPost.push(post._id);
        //     await user.save();
        // } else {
        //     return res.status(400).json({
        //         success: false,
        //         message: "User already liked post"
        //     })
        // }

        post.likes = post.likes + 1;
        await post.save();

        const isLiked = await Like.find({userId : userId, postId : postId});
        console.log("Liked", isLiked);
        if (isLiked.length !== 0) {
            return res.status(200).json({
                message : "Already Liked post",
                success : true
            })
        }

        const newLiked = await Like.create({userId, postId});

        await createNotification(post.userId, userId, 'like', postId);

        return res.status(200).json({
            success: true,
            message: "Post liked",
            body: newLiked
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
        const post = await Post.findById(postId);

        if (!post) {
            return res.status(400).json({
                success: false,
                message: "Post not found"
            })
        }

        const user = await User.findById(userId);
        //  if (user.likedPost.some(id => id.toString() === post._id.toString())) {
        //     user.likedPost.pull(post._id);
        //     await user.save();
        // } else {
        //     return res.status(400).json({
        //         success: false,
        //         message: "User has not liked post so he cannot unlike it."
        //     })
        // }

        post.likes = post.likes - 1;
        await post.save();

        const isLiked = await Like.find({userId : userId, postId : postId});
         if (isLiked.length !== 0) {
            return res.status(200).json({
                message : "Already Liked post",
                success : true
            })
        }

        const newUnLiked = await Like.findByIdAndDelete(isLiked._id);

        return res.status(200).json({
            success: true,
            message: "Post unliked",
            newUnLiked
        })

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

exports.getSavedPost = async(req,res) => {
    try{

        const userId = req.userId;

        const user = await User.findById(userId).populate('savedPost');
        return res.json({
            success:true,
            body: user.savedPost
        })

    } catch(err) {
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
        const userId  = req.body.userId || req.userId;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "UserId required"
            });
        }

        const comments = await Comment.find({ userId: userId })
            .populate("postId", "title")
            .populate("userId", "name profileImage");

        const formatComment = async (comment) => {
            await comment.populate("replies");
            await comment.populate("userId");
            const user = comment.userId;
            return {
                id: comment._id,
                post: comment.postId ? {
                    id: comment.postId._id,
                    title: comment.postId.title
                } : null,
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

        await createNotification(parentComment.userId, userId, 'reply', postId);

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
        
        let posts = await Post.find({})
            .sort(sortOption)
            .populate({
                path: 'userId',
                model: 'User',
                populate: [
                    { path: 'about', model: 'About' },
                    { path: 'education', model: 'Education' },
                    { path: 'experience', model: 'Experience' },
                    { path: 'companyDetails', model: 'CompanyDetails'},
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
    const like = await Like.find({userId : currentUser._id, postId : post._id });
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
        companyDetails: post.userId.companyDetails
    };
};

const formatPost = async (post, currentUser = null) => {
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
    const like = await Like.find({userId : currentUser._id, postId : post._id });
    let isLiked = false;
    if (like.length > 0) {
        isLiked = true;
    }
    //const likesCount = await Like.countDocuments({postId : post._id});


    let originalPost = null;
    if (post.originalPostId) {
        originalPost = formatPost(post.originalPostId, currentUser);
    }

    let communityName = "";
    let communityId = "";
    if (post.type === "Community") {
        communityName = post.communityId?.name;
        communityId = post.communityId._id;
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
        likes : post.likes,
        comments: post.comments?.length || 0,
        isLiked,
        isBookmarked,
        commentsList: post.comments || [],
        originalPost,
        isReposted: post.isReposted,
        type: post.type,
        communityName,
        communityId
    };
};


exports.deletePost = async(req,res) => {
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

    } catch(err) {
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

        // Get community posts that should appear in home feed
        let communityPosts = [];
        if (publicCommunityIds.length > 0) {
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
                postType: post.type
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
exports.getPosts = async (req, res) => {
  try {
    const userId = req.userId;
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User not found",
      });
    }

    const following = user.following || [];
    const followers = user.followers || [];
    const people = [...new Set([...following, ...followers].map(id => id.toString()))];

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
            type: "post"
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
          { path: 'companyDetails', model: 'CompanyDetails'},
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




