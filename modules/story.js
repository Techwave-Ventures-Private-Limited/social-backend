const mongoose = require('mongoose');

const StorySchema = new mongoose.Schema({
  url: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['image', 'video'],
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  // New fields for enhanced story functionality
  caption: {
    type: String,
    maxLength: 250,
    default: ''
  },
  filter: {
    type: String,
    default: null
  },
  hasOverlays: {
    type: Boolean,
    default: false
  },
  source: {
    type: String,
    enum: ['Camera', 'Gallery', null],
    default: null
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  // Overlay data for text and stickers
  overlayData: {
    textElements: [{
      id: String,
      text: String,
      style: {
        fontSize: Number,
        fontFamily: String,
        fontWeight: String,
        color: String,
        textShadowColor: String,
        textShadowOffset: {
          width: Number,
          height: Number
        },
        textShadowRadius: Number
      },
      position: {
        x: Number,
        y: Number
      },
      relativePosition: {
        x: Number,
        y: Number
      }
    }],
    stickerElements: [{
      id: String,
      emoji: String,
      position: {
        x: Number,
        y: Number
      },
      size: Number,
      relativePosition: {
        x: Number,
        y: Number
      }
    }],
    canvasDimensions: {
      width: Number,
      height: Number
    }
  },
  // Thumbnail URL for videos with overlays
  thumbnailUrl: {
    type: String,
    default: null
  },
  // Story analytics (optional)
  views: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    viewedAt: {
      type: Date,
      default: Date.now
    },
    watchDuration: {
      type: Number,
      default: 0
    }
  }],

  comments: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment'
    }
  ],
  // Story expires after 24 hours
  expiresAt: {
    type: Date,
    // Set expiry 24h in the future by default so MongoDB TTL removes it at the correct time
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
    index: { expireAfterSeconds: 0 }
  }
});

// Index for efficient querying
StorySchema.index({ userId: 1, createdAt: -1 });
// TTL index on expiresAt is declared above; no need for an additional plain index.

module.exports = mongoose.model('Story', StorySchema);
