// Community Socket Helper for real-time updates
let io = null;

// Initialize with socket.io instance
const initializeCommunitySocket = (socketIo) => {
    io = socketIo;
};

// Emit new post to community members
const emitNewCommunityPost = (communityId, post) => {
    if (io) {
        io.to(`community_${communityId}`).emit('newCommunityPost', {
            type: 'NEW_POST',
            communityId,
            post
        });
        console.log(`Emitted new post to community_${communityId}`);
    }
};

// Emit new comment/answer to community members
const emitNewCommunityComment = (communityId, comment, postId, isAnswer = false) => {
    if (io) {
        io.to(`community_${communityId}`).emit('newCommunityComment', {
            type: isAnswer ? 'NEW_ANSWER' : 'NEW_COMMENT',
            communityId,
            postId,
            comment
        });
        console.log(`Emitted new ${isAnswer ? 'answer' : 'comment'} to community_${communityId}`);
    }
};

// Emit community member updates (join/leave)
const emitCommunityMemberUpdate = (communityId, member, action) => {
    if (io) {
        io.to(`community_${communityId}`).emit('communityMemberUpdate', {
            type: action, // 'MEMBER_JOINED' or 'MEMBER_LEFT'
            communityId,
            member
        });
        console.log(`Emitted member ${action} to community_${communityId}`);
    }
};

// Emit post moderation actions (pin/delete)
const emitPostModerationAction = (communityId, postId, action, moderator) => {
    if (io) {
        io.to(`community_${communityId}`).emit('postModerationAction', {
            type: action, // 'POST_PINNED', 'POST_UNPINNED', 'POST_DELETED'
            communityId,
            postId,
            moderator
        });
        console.log(`Emitted post moderation ${action} to community_${communityId}`);
    }
};

// Emit role changes
const emitRoleChange = (communityId, userId, newRole, assignedBy) => {
    if (io) {
        io.to(`community_${communityId}`).emit('roleChange', {
            type: 'ROLE_CHANGED',
            communityId,
            userId,
            newRole,
            assignedBy
        });
        console.log(`Emitted role change to community_${communityId}`);
    }
};

// Emit community announcement
const emitCommunityAnnouncement = (communityId, announcement) => {
    if (io) {
        io.to(`community_${communityId}`).emit('communityAnnouncement', {
            type: 'NEW_ANNOUNCEMENT',
            communityId,
            announcement
        });
        console.log(`Emitted announcement to community_${communityId}`);
    }
};

module.exports = {
    initializeCommunitySocket,
    emitNewCommunityPost,
    emitNewCommunityComment,
    emitCommunityMemberUpdate,
    emitPostModerationAction,
    emitRoleChange,
    emitCommunityAnnouncement
};
