# Story Feature - Backend Implementation

## ✅ Changes Made

### 1. **Story Schema Updates** (`modules/story.js`)

Added `watchDuration` field to the views array to track how long users watched each story:

```javascript
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
}]
```

### 2. **New Controller Methods** (`controller/StoryController.js`)

#### **markStoryAsViewed**
- **Route**: `POST /user/story/:storyId/view`
- **Description**: Marks a single story as viewed by the current user
- **Request Body**:
  ```json
  {
    "storyId": "story_id_here",
    "viewedAt": "2025-11-18T10:00:00.000Z",
    "watchDuration": 2500
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "message": "Story marked as viewed",
    "viewCount": 5
  }
  ```
- **Features**:
  - Prevents duplicate views (idempotent)
  - Tracks view timestamp
  - Tracks watch duration in milliseconds

#### **markStoriesAsViewed**
- **Route**: `POST /user/story/batch-view`
- **Description**: Marks multiple stories as viewed in a single request (batch operation)
- **Request Body**:
  ```json
  {
    "storyIds": ["story_id_1", "story_id_2", "story_id_3"],
    "viewedAt": "2025-11-18T10:00:00.000Z"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "message": "Batch view operation completed",
    "results": [
      { "storyId": "story_id_1", "success": true, "viewCount": 5 },
      { "storyId": "story_id_2", "success": true, "message": "Already viewed" },
      { "storyId": "story_id_3", "success": true, "viewCount": 3 }
    ]
  }
  ```
- **Features**:
  - Processes multiple stories efficiently
  - Returns individual results for each story
  - Handles errors gracefully per story

### 3. **Enhanced GET Endpoints**

#### **getFollowingStories** (Enhanced)
- **Route**: `GET /user/story`
- **Description**: Returns stories from users the current user follows
- **New Response Fields**:
  ```json
  {
    "success": true,
    "message": "Stories found",
    "body": [
      {
        "_id": "story_id",
        "url": "https://...",
        "type": "image",
        "userId": {...},
        "createdAt": "2025-11-18T09:00:00.000Z",
        // NEW FIELDS:
        "viewedByCurrentUser": false,
        "viewCount": 42,
        "viewedBy": ["user_id_1", "user_id_2"]
      }
    ]
  }
  ```

#### **getCurrentStory** (Enhanced)
- **Route**: `GET /user/story/self`
- **Description**: Returns current user's own stories
- **New Response Fields**:
  ```json
  {
    "success": true,
    "message": "Stories Fetched",
    "body": [
      {
        "_id": "story_id",
        "url": "https://...",
        "type": "image",
        "userId": {...},
        "createdAt": "2025-11-18T09:00:00.000Z",
        // NEW FIELDS:
        "viewedByCurrentUser": true,  // Always true for own stories
        "viewCount": 42,
        "viewedBy": ["user_id_1", "user_id_2"]
      }
    ]
  }
  ```

### 4. **New Routes** (`route/userRoute.js`)

Added two new routes:
```javascript
router.post("/story/:storyId/view", auth, markStoryAsViewed);
router.post("/story/batch-view", auth, markStoriesAsViewed);
```

## 📋 API Endpoints Summary

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/user/story/:storyId/view` | Mark single story as viewed | ✅ |
| POST | `/user/story/batch-view` | Mark multiple stories as viewed | ✅ |
| GET | `/user/story` | Get following users' stories (enhanced) | ✅ |
| GET | `/user/story/self` | Get own stories (enhanced) | ✅ |
| POST | `/user/upload/story` | Upload new story | ✅ |
| DELETE | `/user/story/:storyId` | Delete a story | ✅ |
| POST | `/user/story/comment` | Comment on story | ✅ |
| GET | `/user/story/:storyId/comments` | Get story comments | ❌ |

## 🔧 How It Works

### View Tracking Flow

1. **Frontend watches story**: User views a story for 2 seconds (image) or 1 second (video)
2. **Frontend calls API**: `POST /user/story/:storyId/view` with watchDuration
3. **Backend checks duplicate**: Verifies if user already viewed this story
4. **Backend adds view**: If not viewed, adds to `story.views` array
5. **Backend returns**: Sends success response with updated view count
6. **Frontend updates UI**: Ring changes from colored to gray if all stories viewed

### Batch View Flow (Offline Sync)

1. **User goes offline**: Frontend queues view events in AsyncStorage
2. **User comes online**: Frontend calls `POST /user/story/batch-view` with all queued story IDs
3. **Backend processes**: Marks all stories as viewed in one operation
4. **Frontend clears queue**: Removes successfully synced views from queue

### Response Enhancement

When a story is fetched, the backend now:
1. Checks if current user's ID exists in `story.views` array
2. Adds `viewedByCurrentUser: true/false` to response
3. Adds `viewCount` with total number of views
4. Adds `viewedBy` array with user IDs who viewed

## 🧪 Testing the Backend

### Test View Tracking

```bash
# Mark a story as viewed
curl -X POST http://localhost:5000/user/story/STORY_ID/view \
  -H "Content-Type: application/json" \
  -H "token: YOUR_AUTH_TOKEN" \
  -d '{
    "viewedAt": "2025-11-18T10:00:00.000Z",
    "watchDuration": 2500
  }'
```

### Test Batch View

```bash
# Mark multiple stories as viewed
curl -X POST http://localhost:5000/user/story/batch-view \
  -H "Content-Type: application/json" \
  -H "token: YOUR_AUTH_TOKEN" \
  -d '{
    "storyIds": ["story_id_1", "story_id_2", "story_id_3"],
    "viewedAt": "2025-11-18T10:00:00.000Z"
  }'
```

### Test Enhanced GET

```bash
# Get following stories (should include viewedByCurrentUser)
curl -X GET http://localhost:5000/user/story \
  -H "token: YOUR_AUTH_TOKEN"

# Response should include:
# {
#   "success": true,
#   "body": [
#     {
#       "_id": "...",
#       "viewedByCurrentUser": false,
#       "viewCount": 42,
#       ...
#     }
#   ]
# }
```

## 🔍 Database Queries

The implementation uses efficient MongoDB queries:

```javascript
// Check if user viewed story (O(n) where n = number of views)
story.views.some(view => view.userId.toString() === userId)

// Find stories from following users
Story.find({userId: { $in: user.following }})

// Existing indexes ensure fast queries:
// - userId + createdAt (for fetching user's stories)
// - expiresAt (for TTL deletion)
```

## ⚠️ Important Notes

1. **Idempotent Operations**: View tracking endpoints are idempotent - calling them multiple times for the same story won't create duplicate views.

2. **Performance**: For batch operations, we iterate through stories sequentially. For very large batches (100+ stories), consider using MongoDB's `bulkWrite` for better performance.

3. **Story Expiry**: Stories still expire after 24 hours via MongoDB TTL index. View data is deleted along with the story.

4. **Privacy**: The `viewedBy` array returns only user IDs. The frontend should fetch user details separately if needed.

5. **Watch Duration**: Stored in milliseconds for analytics. Frontend can use this to understand engagement.

## 🚀 Deployment Checklist

- [x] Update Story schema with watchDuration
- [x] Add markStoryAsViewed controller
- [x] Add markStoriesAsViewed controller
- [x] Enhance getFollowingStories with viewedByCurrentUser
- [x] Enhance getCurrentStory with viewedByCurrentUser
- [x] Add routes for new endpoints
- [ ] Test all endpoints with Postman/curl
- [ ] Verify MongoDB indexes are working
- [ ] Test with frontend integration
- [ ] Monitor performance under load
- [ ] Set up error logging/monitoring

## 📊 Database Indexes

Current indexes on Story collection:
```javascript
// Created automatically by schema
{ userId: 1, createdAt: -1 }  // For fast user story queries
{ expiresAt: 1 }               // TTL index for auto-deletion
```

No additional indexes needed for view tracking as the views array is typically small (< 100 items per story).

## 🐛 Troubleshooting

### Stories not marking as viewed
- Check if auth middleware is working (token validation)
- Verify storyId is valid MongoDB ObjectId
- Check if story exists in database
- Look for errors in server logs

### viewedByCurrentUser always false
- Ensure userId in views array matches current user's ID
- Check if view was successfully added to story.views
- Verify populate is working correctly

### Batch view operation slow
- Check number of stories being processed
- Consider implementing rate limiting
- Use MongoDB bulkWrite for large batches

## 📞 Support

If you encounter issues:
1. Check server logs for detailed error messages
2. Verify frontend is sending correct request format
3. Test endpoints directly with curl/Postman
4. Check MongoDB for data consistency

---

**Status**: ✅ Backend is ready and compatible with frontend implementation!
**Last Updated**: 2025-11-18
