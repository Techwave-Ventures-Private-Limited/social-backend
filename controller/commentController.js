const comment = require("../modules/comment");
const ShowcaseComment = require("../modules/showcaseComment");
const Story = require('../modules/story'); // Assuming your Story model is in this path
const User = require("../modules/user");
const PostComment = require("../modules/comments");

exports.commentOnStory = async (req, res) => {
  try {
    // const userId = req.userId;
    const { storyId, text } = req.body;
    const userId = req.userId; // Get userId from the request, assuming it's set by auth middleware

    // Validate input
    if (!storyId || !text) {
      return res.status(400).json({
        success: false,
        message: "Story ID and comment text are required"
      });
    }

    // Find the story and check if it exists
    const story = await Story.findById(storyId);
    if (!story) {
      return res.status(404).json({
        success: false,
        message: "Story not found"
      });
    }

    // Create a new comment
    const newComment = await comment.create({
      story: storyId,
      user: userId,
      text
    });

    // Add the comment's ID to the story's comments array and save the story
    story.comments.push(newComment._id);
    await story.save();

    return res.status(201).json({
      success: true,
      message: "Comment added successfully",
      body: newComment
    });
    
  } catch (err) {
    console.error(err); // Log the full error for debugging
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};



exports.getCommentsByStoryId = async (req, res) => {
  try {
    const { storyId } = req.params; // Get story ID from URL parameters

    // Find all comments for the given storyId
    // and populate the 'user' field to get user details
    const comments = await comment.find({ story: storyId })
      .populate('user', 'name profileImage'); // Select specific fields from the User model

    if (comments.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No comments found for this story",
        body: []
      });
    }

    return res.status(200).json({
      success: true,
      message: "Comments fetched successfully",
      body: comments
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

exports.saveCommentslikeByStoryId = async (req, res) => {
  try {
    const { storyId, commentId } = req.params; // Need both storyId and commentId
    const userId = req.userId; // Assuming you have user authentication middleware

    // Find and update the comment's like status
    const updatedComment = await comment.findOneAndUpdate(
      { 
        _id: commentId, 
        story: storyId,
        user: userId 
      },
      [
        {
          $set: {
            isLiked: {
              $cond: {
                if: { $ifNull: ["$isLiked", false] }, // if isLiked is null/undefined, treat as false
                then: false,                          // if currently true, set to false
                else: true                           // if currently false, set to true
              }
            },
            likesCount: {
              $cond: {
                if: { $ifNull: ["$isLiked", false] }, // if currently liked
                then: { $subtract: [{ $ifNull: ["$likesCount", 0] }, 1] }, // decrease count
                else: { $add: [{ $ifNull: ["$likesCount", 0] }, 1] }       // increase count
              }
            }
          }
        }
      ],
      { 
        new: true, // Return updated document
        runValidators: true 
      }
    ).populate('user', 'name profileImage');

    if (!updatedComment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: updatedComment.isLiked ? "Comment liked successfully" : "Comment unliked successfully",
      body: updatedComment
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

exports.likeComment = async(req,res) => {
  try {

    const commentId = req.params.commentId;
    const userId = req.userId;
    let comment = await ShowcaseComment.findById(commentId);

    if (!comment) {
      comment = await PostComment.findById(commentId);
      if (!comment) {
         return res.status(400).json({
          success: false,
          message: "Comment not found"
        })
      }
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(400).json({
        succes: false,
        message:"User doesnot exists"
      })
    }

    comment.likes = comment.likes+1;
    await comment.save();

    user.likedComments.push(commentId);
    await user.save();

    return res.status(200).json({
      success: true,
      message:"Comment liked",
      comment
    })

  } catch(err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
}

exports.unlikeComment = async(req,res) => {
  try {

    const commentId = req.params.commentId;
    const userId = req.userId;
    let comment = await ShowcaseComment.findById(commentId);

    if (!comment) {
      comment = await PostComment.findById(commentId);
      if (!comment) {
         return res.status(400).json({
          success: false,
          message: "Comment not found"
        })
      }
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(400).json({
        succes: false,
        message:"User doesnot exists"
      })
    }

    comment.likes = comment.likes-1;
    await comment.save();

    user.likedComments.pull(commentId);
    await user.save();

    return res.status(200).json({
      success: true,
      message:"Comment unliked",
      comment
    })

  } catch(err) {
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
}