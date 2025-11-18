const User = require("../modules/user");
const Story = require("../modules/story");
const {uploadImageToCloudinary, uploadVideoToCloudinary} = require("../utils/imageUploader");

function isSameDay(d1, d2) {
  if (!d1 || !d2) return false;
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
}

exports.createStory = async (req, res) => {
  try {
    const userId = req.userId;
    const { caption, filter, overlayData, hasOverlays } = req.body;
    let files = req.files && req.files.media;

    if (!files) {
      return res.status(400).json({
        success: false,
        message: "No media files uploaded",
      });
    }

    files = Array.isArray(files) ? files : [files];
    const uploadedStoriesIds = [];

    for (const file of files) {
      const isVideo = file.mimetype.startsWith("video");
      let result;
      const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
      if (isVideo) {
        result = await uploadVideoToCloudinary(file, process.env.FOLDER_NAME || "stories", "auto", expiresAt);
      } else {
        // Store full-resolution original (no resize, no quality compression at upload)
        result = await uploadImageToCloudinary(file, process.env.FOLDER_NAME || "stories", null, null, expiresAt);
      }

      const createdStory = await Story.create({
        url: result.secure_url,
        type: isVideo ? "video" : "image",
        userId: userId,
        caption: caption || '',
        filter: filter || null,
        hasOverlays: hasOverlays || false,
        overlayData: overlayData ? JSON.parse(overlayData) : null,
        createdAt: new Date(),
        // Ensure TTL field is set explicitly to 24h ahead (MongoDB TTL will delete when this time passes)
        expiresAt: new Date(expiresAt)
      })

      uploadedStoriesIds.push(createdStory._id);
    }

    let user = await User.findById(userId).populate("stories");
    if (!user) {
        return res.status(404).json({
            success: false,
            message: "User not found"
        })
    }

    const today = new Date();
    const lastUpdate = user.lastStreakUpdate;

    // Only update streak if they haven't already posted today
    if (!lastUpdate || !isSameDay(today, lastUpdate)) {
        
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);

        if (lastUpdate && isSameDay(yesterday, lastUpdate)) {
            // --- Streak Continued ---
            // Their last update was yesterday, so increment the streak
            user.streak += 1;
        } else {
            // --- New or Broken Streak ---
            // They either missed a day or this is their first post ever.
            // Start a new streak of 1 (for today's post).
            user.streak = 1; 
        }
        
        // Mark today as the last time the streak was updated
        user.lastStreakUpdate = today;
    }

    user.stories.push(...uploadedStoriesIds);
    user = await user.save({new : true});

    return res.status(200).json({
      success: true,
      message: "Stories uploaded successfully",
      body : user,
      stories: user.stories
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

exports.getFollowingStories = async(req, res) => {
    try{

        const userId = req.userId;
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            })
        }
        
        const stories = await Story.find({userId: { $in: user.following }}).populate("userId", "name profileImage streak");
        
        // Add viewedByCurrentUser field to each story
        const enrichedStories = stories.map(story => {
            const storyObj = story.toObject();
            storyObj.viewedByCurrentUser = story.views.some(view => view.userId.toString() === userId);
            storyObj.viewCount = story.views.length;
            storyObj.viewedBy = story.views.map(v => v.userId.toString());
            return storyObj;
        });
        
        return res.status(200).json({
            success: true,
            message: "Stories found",
            body: enrichedStories
        })
    } catch(err) {
        return res.status(500).json({
            success: false,
            message: err.message
        })
    }
}

exports.getCurrentStory = async(req,res) => {
  try{

    const userId = req.userId;

    const stories = await Story.find({userId}).populate("userId", "name profileImage streak");
    
    // Add viewedByCurrentUser field to each story (for own stories, it's always true)
    const enrichedStories = stories.map(story => {
        const storyObj = story.toObject();
        storyObj.viewedByCurrentUser = true; // User's own stories are always "viewed"
        storyObj.viewCount = story.views.length;
        storyObj.viewedBy = story.views.map(v => v.userId.toString());
        return storyObj;
    });

    return res.status(200).json({
      success: true,
      message: "Stories Fetched",
      body: enrichedStories
    })

  } catch(err) {
    return res.status(500).json({
      success : false,
      message : err.message
    })
  }
}

exports.deleteStory = async(req,res) => {
  try {
    
    const userId = req.userId;
    const storyId = req.params.storyId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(400).json({
        success: false,
        message:"User not found"
      })
    }


    
    user.stories = user.stories.filter( 
      (story) => story.toString() !== storyId 
    )

    await user.save();

    await Story.findByIdAndDelete(storyId);

    return res.status(200).json({
      success: true,
      message: "Story deleted successfully"
    })

  } catch(err) {
    return res.status(500).json({
      success:false,
      message: err.message
    })
  }
}

/**
 * Mark a story as viewed by the current user
 */
exports.markStoryAsViewed = async (req, res) => {
  try {
    const userId = req.userId;
    const { storyId } = req.params;
    const { viewedAt, watchDuration } = req.body;

    const story = await Story.findById(storyId);
    if (!story) {
      return res.status(404).json({
        success: false,
        message: "Story not found"
      });
    }

    // Check if user already viewed this story
    const alreadyViewed = story.views.some(view => view.userId.toString() === userId);
    
    if (!alreadyViewed) {
      // Add view record
      story.views.push({
        userId: userId,
        viewedAt: viewedAt ? new Date(viewedAt) : new Date(),
        watchDuration: watchDuration || 0
      });
      
      await story.save();
    }

    return res.status(200).json({
      success: true,
      message: "Story marked as viewed",
      viewCount: story.views.length
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

/**
 * Mark multiple stories as viewed (batch operation)
 */
exports.markStoriesAsViewed = async (req, res) => {
  try {
    const userId = req.userId;
    const { storyIds, viewedAt } = req.body;

    if (!Array.isArray(storyIds) || storyIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "storyIds must be a non-empty array"
      });
    }

    const viewTimestamp = viewedAt ? new Date(viewedAt) : new Date();
    const results = [];

    for (const storyId of storyIds) {
      try {
        const story = await Story.findById(storyId);
        if (!story) {
          results.push({ storyId, success: false, message: "Story not found" });
          continue;
        }

        // Check if user already viewed this story
        const alreadyViewed = story.views.some(view => view.userId.toString() === userId);
        
        if (!alreadyViewed) {
          story.views.push({
            userId: userId,
            viewedAt: viewTimestamp,
            watchDuration: 0
          });
          await story.save();
          results.push({ storyId, success: true, viewCount: story.views.length });
        } else {
          results.push({ storyId, success: true, message: "Already viewed" });
        }
      } catch (err) {
        results.push({ storyId, success: false, message: err.message });
      }
    }

    return res.status(200).json({
      success: true,
      message: "Batch view operation completed",
      results
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};
