const User = require("../modules/user");
const Showcase = require("../modules/showcase");
const Comment = require("../modules/showcaseComment");
const Opportunity = require("../modules/opportunity");
const { uploadMultipleImagesToCloudinary, uploadImageToCloudinary } = require("../utils/imageUploader");
const { createNotification } = require('../utils/notificationUtils');

exports.createShowcase = async(req,res) => {
    try {

        const userId = req.userId;
        let logo = req.files && req.files.logo;
        let bannerImage = req.files && req.files.bannerImage;
        let images = req.files && req.files.images;
        let imagesUrls;
        if (images) {
            images = Array.isArray(images) ? images : [images];
            const uploadedImages = await uploadMultipleImagesToCloudinary(
                images,
                process.env.FOLDER_NAME,
                1000,
                1000
            )
            imagesUrls = uploadedImages.map(img => img.secure_url);
        }
        let logoUrl = "";
        if (logo) {
            const uploadedLogo = await uploadImageToCloudinary(logo, process.env.FOLDER_NAME, 1000, 1000);
            logoUrl = uploadedLogo.secure_url;
        }

        let bannerImageUrl = "";
        if (bannerImage) {
            const uploadedBannerImage = await uploadImageToCloudinary(bannerImage, process.env.FOLDER_NAME, 1000, 1000);
            bannerImageUrl = uploadedBannerImage.secure_url;
        }

        const {category, projectTitle, tagline, description, problem, solution, revenueModel, demoVideoLink, tags, projectLinks, opportunities: opportunitiesString} = req.body;

        console.log(req.body);
        
        let opportunities = [];
        if (opportunitiesString) {
            try {
                opportunities = JSON.parse(opportunitiesString);
            } catch (parseError) {
                console.warn("Could not parse opportunities JSON string:", parseError);
                // Fail gracefully, will just create 0 opportunities
            }
        }

        const createdShowcase = await Showcase.create({
            userId,
            logo: logoUrl,
            images: imagesUrls,
            bannerImageUrl,
            category,
            projectTitle,
            tagline,
            description,
            problem,
            solution,
            revenueModel,
            demoVideoLink,
            tags,
            projectLinks
        });

        // 3. --- NEW LOGIC ---
        //    Now, create the opportunities and link them
        let createdOpportunities = [];
        if (opportunities && Array.isArray(opportunities) && opportunities.length > 0) {
            
            const opportunityDocs = opportunities.map(op => ({
                ...op, // (title, description, category, skills)
                showcaseId: createdShowcase._id,
                postedBy: userId
            }));

            createdOpportunities = await Opportunity.insertMany(opportunityDocs);
            
            const opportunityIds = createdOpportunities.map(op => op._id);
            createdShowcase.opportunities = opportunityIds;
            await createdShowcase.save();
        }



        return res.status(200).json({
            success: true,
            message: "Showcase created successfully",
            body: {
                showcase: createdShowcase,
                opportunities: createdOpportunities
            }
        })

    } catch(err) {
        return res.status(500).json({
            success: false,
            message: err.message
        })
    }
}

exports.getShowcases = async(req,res) => {
    try {

        const showcases = await Showcase.find()
            .populate('opportunities')
            .lean();
        
        console.log(showcases);
        
        return res.status(200).json({
            success: true,
            message: "Showcase found",
            body: showcases
        })

    } catch(err) {
        return res.status(500).json({
            success: false,
            message: err.message
        })
    }
}

exports.getUserShowcase = async(req,res) => {
    try {
        const userId = req.userId;

        const showcases = await Showcase.find({userId : userId});
        
        return res.status(200).json({
            success: true,
            message: "Showcase found",
            body: showcases
        })

    } catch(err) {
        return res.status(500).json({
            success: false,
            message: err.message
        })
    }
}

exports.deleteShowcase = async(req,res) => {
    try {

        const {showcaseId} = req.params;

        if (!showcaseId) {
            return res.status(400).json({
                success: false,
                message: "ShowcaseId required"
            })
        }

        await Showcase.findByIdAndDelete(showcaseId);

        return res.status(200).json({
            success: true,
            message: "Showcase deleted"
        })

    } catch(err) {
        return res.status(500).json({
            success: false,
            message: err.message
        })
    }
}

exports.upvote = async(req,res) => {
    try {
        const showcaseId = req.params.showcaseId;

        const showcase = await Showcase.findById(showcaseId);

        if (!showcase) {
            return res.status(400).json({
                success: false,
                message: "Showcase not found"
            })
        }

        const userId = req.userId;

        showcase.upvotesUsers.push(userId);
        showcase.upvotes = showcase.upvotes + 1;
        await showcase.save();

        return res.status(200).json({
            success: true,
            message: "Upvote successfull"
        })

    } catch(err) {
        return res.status(500).json({
            success: false,
            message: err.message
        })
    }
}

exports.downvote = async(req,res) => {
    try {
        const showcaseId = req.params.showcaseId;

        const showcase = await Showcase.findById(showcaseId);

        if (!showcase) {
            return res.status(400).json({
                success: false,
                message: "Showcase not found"
            })
        }

        const userId = req.userId;

        showcase.upvotesUsers.pull(userId);
        showcase.upvotes = showcase.upvotes - 1;
        await showcase.save();

        return res.status(200).json({
            success: true,
            message: "Downvote successfull"
        })

    } catch(err) {
        return res.status(500).json({
            success: false,
            message: err.message
        })
    }
}

exports.commentShowcase = async (req, res) => {
    try {
        const { showcaseId, text } = req.body;

        if (!showcaseId || !text) {
            return res.json({
                success: false,
                message: "showcaseId and text required"
            })
        }

        const showcase = await Showcase.findById(showcaseId);
        if (!showcase) {
            return res.status(400).json({
                success: false,
                message: "Showcase Not found"
            })
        }

        const comment = await Comment.create({ text, showcaseId, userId: req.userId });

        showcase.comments.push(comment._id);
        await showcase.save();

        await createNotification(showcase.userId, req.userId, 'comment', showcaseId);

        return res.status(200).json({
            success: true,
            message: "Comment created ",
            body: comment,
            showcase: showcase
        })

    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        })
    }
}

exports.getCommentsForShowcase = async (req, res) => {
    try {
        const { showcaseId } = req.params;

        if (!showcaseId) {
            return res.status(400).json({
                success: false,
                message: "showcaseId required"
            })
        }

        // Fetch all comments for the showcase, populate userId
        const comments = await Comment.find({ showcaseId: showcaseId }).populate('userId');

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

exports.replyToComment = async (req, res) => {
    try {
        const { showcaseId, commentId, content } = req.body;
        const userId = req.userId;

        if (!showcaseId || !commentId || !content) {
            return res.status(400).json({
                success: false,
                message: "showcaseId, commentId, and content are required"
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
            showcaseId,
            replyTo: commentId,
            userId: req.userId
        });

        // Add reply to parent's replies array
        parentComment.replies = parentComment.replies || [];
        parentComment.replies.push(replyComment._id);
        await parentComment.save();

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
