const Post = require("../modules/post");
const User = require("../modules/user");
const Comment = require("../modules/comments");
const { uploadMultipleImagesToCloudinary } = require("../utils/imageUploader");

exports.createPost = async (req, res) => {
    try {

        const { discription, postType } = req.body;
        const userId = req.userId;

        // Accept multiple files (media)
        let files = req.files && req.files.media;
        if (!files) {
            return res.status(400).json({
                success: false,
                message: "No media files uploaded"
            });
        }
        files = Array.isArray(files) ? files : [files];

        if (!discription || !postType) {
            return res.status(400).json({
                success: false,
                message: "Discription and postType are required"
            })
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(400).json({
                success: false,
                message: "User does not exists"
            })
        }

        const images = await uploadMultipleImagesToCloudinary(
            files,
            process.env.FOLDER_NAME,
            1000,
            1000
        )
        const imageUrls = images.map(img => img.secure_url);

        const createdPost = await Post.create({
            discription,
            media: imageUrls,
            postType,
            userId
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
            })
        }

        const post = await Post.findById(postId).populate("comments");

        return res.status(200).json({
            success: true,
            message: "Post found",
            body: post
        })

    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        })
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

        if (!post) {
            return res.status(400).json({
                success: false,
                message: "Post not found"
            })
        }

        post.likes = post.likes + 1;
        await post.save();

        return res.status(200).json({
            success: true,
            message: "Post liked",
            body: post
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

        const comment = await Comment.create({ text, postId });

        post.comments.push(comment._id);
        await post.save();

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

exports.getCommentsForPost = async (req, res) => {
    try {
        const { postId } = req.params;

        if (!postId) {
            return res.status(400).json({
                success: false,
                message: "PostId required"
            })
        }

        const comments = await Comment.find({ postId: postId });
        const userId = req.userId;
        const user = await User.findById(userId);

        // Format each comment as requested
        const formattedComments = await Promise.all(comments.map(async (comment) => {
            // If you want to support per-comment author, you need to store userId in comment schema
            // For now, use the current user as author
            return {
                id: comment._id,
                author: {
                    id: user._id,
                    name: user.name,
                    avatar: user.profileImage || null
                },
                content: comment.text,
                createdAt: comment.createAt ? comment.createAt.toISOString() : new Date().toISOString(),
                likes: comment.likes || 0,
                isLiked: false, // No per-user like tracking
                replies: []
            };
        }));

        return res.status(200).json({
            success: true,
            message: "Comments found",
            body: formattedComments
        })
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        })
    }
}

exports.getAllPosts = async (req, res) => {
    try {
        const filter = req.query.filter;
        let posts;
        
        if (filter == 0) {
            posts = await Post.find()
                .populate({
                    path: 'userId',
                    model: 'User',
                    populate: [
                        { path: 'about', model: 'About' },
                        { path: 'education', model: 'Education' },
                        { path: 'experience', model: 'Experience' }
                    ]
                })
                .populate('comments');
        } else if (filter == 1) {
            posts = await Post.find()
                .sort({ createdAt: -1 })
                .populate({
                    path: 'userId',
                    model: 'User',
                    populate: [
                        { path: 'about', model: 'About' },
                        { path: 'education', model: 'Education' },
                        { path: 'experience', model: 'Experience' }
                    ]
                })
                .populate('comments');
        }

        // Get current user for isBookmarked and isFollowing
        let currentUser = null;
        if (req.userId) {
            currentUser = await User.findById(req.userId);
        }

        const formattedPosts = posts.map(post => {
            // Determine isBookmarked
            let isBookmarked = false;
            if (currentUser && currentUser.savedPost) {
                isBookmarked = currentUser.savedPost.some(
                    savedId => savedId.toString() === post._id.toString()
                );
            }

            // isLiked is always false (no per-user like tracking)
            let isLiked = false;

            // Map author (user) to full User interface
            const author = post.userId;
          
            
            // Handle case where author might not be populated
            if (!author) {
                console.log('Author not found for post:', post._id);
                return null; // Skip this post or handle as needed
            }

            let about = author.about || {};
            let education = author.education || [];
            let experience = author.experience || [];
            let skills = (about.skills && Array.isArray(about.skills)) ? about.skills : [];

            // Followers/following count
            const followers = author.followers ? author.followers.length : 0;
            const following = author.following ? author.following.length : 0;

            // isFollowing: is currentUser following this author?
            let isFollowing = false;
            if (currentUser && author.followers) {
                isFollowing = author.followers.some(f => f.toString() === currentUser._id.toString());
            }

            return {
                id: post._id,
                author: {
                    id: author._id,
                    name: author.name,
                    username: null, // not in schema
                    email: author.email,
                    avatar: author.profileImage || null,
                    coverImage: null, // not in schema
                    headline: about.headline || null,
                    bio: author.bio || null,
                    location: about.location || null,
                    website: about.website || null,
                    joinedDate: author.createAt ? author.createAt.toISOString() : null,
                    followers,
                    following,
                    streak: null, // not in schema
                    lastStoryDate: null, // not in schema
                    isFollowing,
                    profileViews: null, // not in schema
                    education,
                    experience,
                    skills,
                    phone: about.phone || null,
                    socialLinks: [], // not in schema
                    isCounselor: false, // not in schema
                    counselorInfo: null // not in schema
                },
                content: post.discription,
                images: post.media,
                createdAt: post.createdAt,
                likes: post.likes,
                comments: post.comments.length,
                isLiked,
                isBookmarked,
                commentsList: post.comments
            };
        }).filter(post => post !== null); // Remove any null posts

        return res.status(200).json({
            success: true,
            body: formattedPosts
        });

    } catch (err) {
        console.error('Error in getAllPosts:', err);
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
};