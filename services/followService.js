const User = require('../modules/user'); // Adjust path as needed
const { createNotification } = require('../utils/notificationUtils');

/**
 * Makes one user follow another.
 * This is a reusable service, safe to call from anywhere.
 *
 * @param {string} userId - The ID of the user doing the following.
 * @param {string} userToFollowId - The ID of the user to be followed.
 */
exports.createFollowship = async (userId, userToFollowId) => {
    // 1. Prevent self-follow
    if (userId === userToFollowId) {
        console.warn(`[FollowService] User ${userId} cannot follow themselves.`);
        return;
    }

    console.log(`[FollowService] User ${userId} is attempting to follow ${userToFollowId}.`);

    // 2. Find both users in parallel
    const [user, userToFollow] = await Promise.all([
        User.findById(userId),
        User.findById(userToFollowId)
    ]);

    // 3. Check if users exist
    if (!user) {
        throw new Error(`[FollowService] Following user ${userId} not found.`);
    }
    if (!userToFollow) {
        throw new Error(`[FollowService] User to follow ${userToFollowId} not found.`);
    }

    // 4. Check if already following (prevents duplicate entries)
    if (user.following.includes(userToFollow._id)) {
        console.warn(`[FollowService] User ${userId} is already following ${userToFollowId}.`);
        return;
    }

    // 5. Perform the follow logic (this is from your function)
    user.following.push(userToFollow._id);
    userToFollow.followers.push(user._id);

    // 6. Save both users in parallel
    await Promise.all([
        user.save(),
        userToFollow.save()
    ]);

    // 7. Create notification
    await createNotification(userToFollow._id, userId, 'follow');

    console.log(`[FollowService] ${user.name} successfully followed ${userToFollow.name}.`);
};