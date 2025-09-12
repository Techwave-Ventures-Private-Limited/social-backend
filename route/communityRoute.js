const express = require('express');
const router = express.Router();
const { auth: authMiddleware } = require('../middleware/authMiddleware');
const CommunityController = require('../controller/CommunityController');

// ================================
// COMMUNITY CRUD ROUTES
// ================================

// GET /community - Get all communities with filters
router.get('/', CommunityController.getAllCommunities);

// GET /community/user - Get user's joined communities (requires auth)
router.get('/user', authMiddleware, CommunityController.getUserCommunities);

// GET /community/:id - Get specific community details
router.get('/:id', CommunityController.getCommunityById);

// POST /community - Create new community (requires auth)
router.post('/', authMiddleware, CommunityController.createCommunity);

// PUT /community/:id - Update community (requires auth + admin)
router.put('/:id', authMiddleware, CommunityController.updateCommunity);

// DELETE /community/:id - Delete community (requires auth + owner)
router.delete('/:id', authMiddleware, CommunityController.deleteCommunity);

// ================================
// MEMBERSHIP ROUTES
// ================================

// POST /community/:id/join - Join community (requires auth)
router.post('/:id/join', authMiddleware, CommunityController.joinCommunity);

// POST /community/:id/leave - Leave community (requires auth)
router.post('/:id/leave', authMiddleware, CommunityController.leaveCommunity);

// ================================
// COMMUNITY POST ROUTES
// ================================

// GET /community/feed/home - Get posts for home feed with privacy rules (requires auth)
router.get('/feed/home', authMiddleware, CommunityController.getPostsForHomeFeed);

// GET /community/:id/posts - Get community posts (public or member access)
router.get('/:id/posts', authMiddleware, CommunityController.getCommunityPosts);

// POST /community/:id/posts - Create post in community (requires auth + membership)
router.post('/:id/posts', authMiddleware, CommunityController.createCommunityPost);

// POST /community/posts/:postId/like - Like/unlike community post (requires auth)
router.post('/posts/:postId/like', authMiddleware, CommunityController.likeCommunityPost);

// POST /community/posts/:postId/comments - Add comment to community post (requires auth)
router.post('/posts/:postId/comments', authMiddleware, CommunityController.addCommentToCommunityPost);

// ================================
// MODERATION ROUTES (ADMIN/OWNER)
// ================================

// POST /community/posts/:postId/pin - Pin/unpin post (requires auth + moderator)
router.post('/posts/:postId/pin', authMiddleware, CommunityController.pinPost);

// DELETE /community/posts/:postId - Delete community post (requires auth + permission)
router.delete('/posts/:postId', authMiddleware, CommunityController.deleteCommunityPost);

// ================================
// MEMBER MANAGEMENT ROUTES (ADMIN/OWNER)
// ================================

// POST /community/requests/:requestId/handle - Approve/reject join request (requires auth + moderator)
router.post('/requests/:requestId/handle', authMiddleware, CommunityController.handleJoinRequest);

// POST /community/:id/members/:memberId/role - Assign role to member (requires auth + admin)
router.post('/:id/members/:memberId/role', authMiddleware, CommunityController.assignRole);

// DELETE /community/:id/members/:memberId - Remove member from community (requires auth + moderator)
router.delete('/:id/members/:memberId', authMiddleware, CommunityController.removeMember);

module.exports = router;
