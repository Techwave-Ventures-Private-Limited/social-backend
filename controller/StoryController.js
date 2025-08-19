const User = require("../modules/user");
const Story = require("../modules/story");
const { uploadImageToCloudinary, uploadVideoToCloudinary } = require("../utils/imageUploader");

exports.createStory = async (req, res) => {
  try {
    const userId = req.userId;
    let files = req.files && req.files.media;
    
    // Extract additional data from request body
    const {
      caption = '',
      filter = 'none',
      hasOverlays = 'false',
      contentType,
      timestamp,
      source,
      overlayData,
      requiresComposition = 'false'
    } = req.body;

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
      
      // Parse overlay data if exists
      let parsedOverlayData = null;
      if (hasOverlays === 'true' && overlayData) {
        try {
          parsedOverlayData = JSON.parse(overlayData);
        } catch (error) {
          console.error('Error parsing overlay data:', error);
        }
      }

      // Handle server-side composition if needed
      let finalMediaUrl;
      let thumbnailUrl = null;
      
      if (requiresComposition === 'true' && parsedOverlayData) {
        // For now, upload original media and store overlay data
        // In a production environment, you would process the overlays here
        if (isVideo) {
          result = await uploadVideoToCloudinary(
            file, 
            process.env.FOLDER_NAME || "stories", 
            "auto", 
            expiresAt
          );
          
          // Handle poster/thumbnail if provided for videos with overlays
          if (req.files && req.files.poster) {
            const posterFile = req.files.poster;
            const posterResult = await uploadImageToCloudinary(
              posterFile,
              process.env.FOLDER_NAME || "stories", 
              400, 
              "auto", 
              expiresAt
            );
            thumbnailUrl = posterResult.secure_url;
          }
        } else {
          // For images with overlays, you might want to process them server-side
          // For now, we'll upload the original and store overlay metadata
          result = await uploadImageToCloudinary(
            file, 
            process.env.FOLDER_NAME || "stories", 
            400, 
            "auto", 
            expiresAt
          );
        }
        finalMediaUrl = result.secure_url;
      } else {
        // Standard upload without overlays
        if (isVideo) {
          result = await uploadVideoToCloudinary(
            file, 
            process.env.FOLDER_NAME || "stories", 
            "auto", 
            expiresAt
          );
        } else {
          result = await uploadImageToCloudinary(
            file, 
            process.env.FOLDER_NAME || "stories", 
            400, 
            "auto", 
            expiresAt
          );
        }
        finalMediaUrl = result.secure_url;
      }

      // Create story with additional metadata
      const storyData = {
        url: finalMediaUrl,
        type: isVideo ? "video" : "image",
        userId: userId,
        files,
        createdAt: new Date(),
        // Additional fields for enhanced functionality
        caption: caption || '',
        filter: filter !== 'none' ? filter : null,
        hasOverlays: hasOverlays === 'true',
        source: source || null,
        timestamp: timestamp ? new Date(parseInt(timestamp)) : new Date(),
      };

      // Add overlay data if present
      if (parsedOverlayData) {
        storyData.overlayData = {
          textElements: parsedOverlayData.textElements || [],
          stickerElements: parsedOverlayData.stickerElements || [],
          canvasDimensions: parsedOverlayData.canvasDimensions || null
        };
      }

      // Add thumbnail URL for videos with overlays
      if (thumbnailUrl) {
        storyData.thumbnailUrl = thumbnailUrl;
      }

      const createdStory = await Story.create(storyData);
      uploadedStoriesIds.push(createdStory._id);
    }

    // Handle user streak logic
    let user = await User.findById(userId).populate("stories");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const now = new Date(Date.now());
    if (Object.keys(user.stories).length !== 0) {
      let flag = true;
      for (const story of user.stories) {
        if (story.createdAt.getDate() === now.getDate()) {
          flag = false;
        }
        if (!flag) break;
      }
      if (flag) {
        user.streak = user.streak + 1;
      }
    } else {
      user.streak = user.streak + 1;
    }

    user.stories.push(...uploadedStoriesIds);
    user = await user.save({ new: true });

    // Get the created stories for response
    const createdStories = await Story.find({ _id: { $in: uploadedStoriesIds } });

    return res.status(200).json({
      success: true,
      message: "Stories uploaded successfully",
      body: user,
      stories: createdStories,
      metadata: {
        hasOverlays: hasOverlays === 'true',
        requiresComposition: requiresComposition === 'true',
        filter: filter !== 'none' ? filter : null,
        source: source || null
      }
    });

  } catch (err) {
    console.error('Story creation error:', err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

exports.getFollowingStories = async (req, res) => {
  try {
    const userId = req.userId;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const followingUserIds = user.following; // These are User IDs
  const stories = await Promise.all(
  followingUserIds.map(async (followedUserId) => {
    console.log("Fetching story for:", followedUserId.toString());

    return await Story.findOne({ userId: followedUserId  }) 
      .populate("userId", "name profileImage")
      .sort({ createdAt: -1 });
  })
);


    const filteredStories = stories.filter(story => story !== null);

    return res.status(200).json({
      success: true,
      message: "Latest stories from followed users",
      body: filteredStories
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};


exports.getCurrentStory = async (req, res) => {
  try {

    const userId = req.userId;

    const stories = await Story.find({ userId });

    return res.status(200).json({
      success: true,
      message: "Stories Fetched",
      body: stories
    })

  } catch (err) {
    return res.statu(500).json({
      success: false,
      message: err.message
    })
  }
}

exports.deleteStory = async (req, res) => {
  try {

    const userId = req.userId;
    const storyId = req.params.storyId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User not found"
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

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    })
  }
}
