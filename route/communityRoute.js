const express = require('express');
const router = express.Router();
const { auth: authMiddleware } = require('../middleware/authMiddleware');
const CommunityController = require('../controller/CommunityController');

// Community list & user-specific
router.get('/', CommunityController.getAllCommunities);
router.get('/user', authMiddleware, CommunityController.getUserCommunities);

// Feed
router.get('/feed/home', authMiddleware, CommunityController.getPostsForHomeFeed);

// Community posts (must come before /:id)
router.get('/:id/posts', authMiddleware, CommunityController.getCommunityPosts);
router.post('/:id/posts', authMiddleware, CommunityController.createCommunityPost);

// Post actions
router.post('/posts/:postId/like', authMiddleware, CommunityController.likeCommunityPost);
router.post('/posts/:postId/comments', authMiddleware, CommunityController.addCommentToCommunityPost);
router.post('/posts/:postId/pin', authMiddleware, CommunityController.pinPost);
router.delete('/posts/:postId', authMiddleware, CommunityController.deleteCommunityPost);

// Membership actions
router.post('/:id/join', authMiddleware, CommunityController.joinCommunity);
router.post('/:id/leave', authMiddleware, CommunityController.leaveCommunity);

// Member management
router.get('/:id/members', authMiddleware, CommunityController.getCommunityMembers);
router.post('/:id/members/:memberId/assignRole', authMiddleware, CommunityController.assignRole);
router.delete('/:id/members/:memberId/removeRole', authMiddleware, CommunityController.removeRole);
router.delete('/:id/members/:memberId', authMiddleware, CommunityController.removeMember);
router.post('/:id/members/:memberId/ban', authMiddleware, CommunityController.banUser);

// Individual accept/reject Join requests
router.post('/requests/:requestId/handle', authMiddleware, CommunityController.handleJoinRequest);

// View all join requests for a community
router.get('/:id/join-requests', authMiddleware, CommunityController.getAllJoinRequests);

// Bulk accept/reject join requests
router.post('/:id/join-requests/bulk-handle', authMiddleware, CommunityController.bulkHandleJoinRequests);

// Community CRUD (generic routes last!)
router.post('/', authMiddleware, CommunityController.createCommunity);
router.put('/:id', authMiddleware, CommunityController.updateCommunity);
router.delete('/:id', authMiddleware, CommunityController.deleteCommunity);
router.get('/:id', CommunityController.getCommunityById);

// update logo and cover-image
router.put('/:id/cover-image', authMiddleware, CommunityController.updateCoverImage);
router.put('/:id/logo', authMiddleware, CommunityController.updateLogo);

// Community Settings
router.put('/:id/settings/allow-member-posts', authMiddleware, CommunityController.setAllowMemberPosts);
router.put('/:id/settings/require-join-approval', authMiddleware, CommunityController.setRequireJoinApprovals);

module.exports = router;
