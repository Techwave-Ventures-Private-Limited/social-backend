// controller/UserRecommendationController.js
const User = require('../modules/user');
const Connection = require('../modules/connection');
const mongoose = require('mongoose');


// These are the "seed" users (e.g., co-founders) to use when
// a new user has 0 follows.
const DEFAULT_SEED_USER_IDS = [
    '68adec288984c913b5d23fe8',
    '68aee7c78984c913b5d24051',
    '68af41578984c913b5d24243',
    '6912fc6dc4802d0fe7f01fa5',
    '690ca0eb9b77f63442a71bee',
    '690dd6699b77f63442a721ef'
].map(id => new mongoose.Types.ObjectId(id));



/**
 * Gets user recommendations for a given user.
 *
 * @param {string} userId - The ID of the user to get recommendations for.
 * @returns {Array<User>} - A list of up to 12 recommended users.
 */
exports.getRecommendations = async (userId) => {
    const RECOMMENDATION_LIMIT = 20;
    const currentUserId = new mongoose.Types.ObjectId(userId);

    // --- Step 1: Get 1st Degree IDs and create an exclusion list ---

    // 💡 CHANGE 1: Find all users the current user is following (1st-degree connections)
    const followedConnections = await Connection.find({ follower: currentUserId })
        .select('following') // We only need the ID of the person they are following
        .lean();

    const firstDegreeIds = followedConnections.map(conn => conn.following);

    // Exclusion Set: Current user + all 1st-degree connections
    const exclusionSet = new Set(firstDegreeIds.map(id => id.toString()));
    exclusionSet.add(userId.toString());
    
    // Convert exclusion set back to ObjectIds for Mongoose queries
    const exclusionObjectIds = Array.from(exclusionSet).map(id => new mongoose.Types.ObjectId(id));

    // --- Step 2: Find all 2nd-degree "follows-of-follows" ---
    let sourceIds = firstDegreeIds;

    // If the user isn't following anyone, use the default seed list
    if (!sourceIds || sourceIds.length === 0) {
        // console.log(`[Recommender] User ${userId} has no follows. Using default seed list.`);
        sourceIds = DEFAULT_SEED_USER_IDS;
    }

    // 💡 CHANGE 2: Find all users being followed by our 1st-degree connections (2nd-degree)
    const secondDegreeConnections = await Connection.find({ follower: { $in: sourceIds } })
        .select('following') // The user being followed by our 1st-degree connections
        .lean();

    // Flatten all 'follows-of-follows' into one array
    const potentialSecondDegreeIds = secondDegreeConnections.map(conn => conn.following);

    // --- Step 3: Count and Rank 2nd-degree connections (Logic remains the same) ---
    const idCounts = new Map();
    
    for (const id of potentialSecondDegreeIds) {
        const idStr = id.toString();
        // Check if the 2nd-degree connection is NOT in our exclusion list
        if (!exclusionSet.has(idStr)) {
            idCounts.set(idStr, (idCounts.get(idStr) || 0) + 1);
        }
    }

    const rankedSecondDegreeIds = Array.from(idCounts.entries())
        .sort((a, b) => b[1] - a[1]) // Sort by count [1]
        .map(entry => entry[0]);    // Get just the ID [0]

    let finalIdStrings = rankedSecondDegreeIds.slice(0, RECOMMENDATION_LIMIT);

    // --- Step 4: Handle Fallback (Global Popular Users) ---
    const needed = RECOMMENDATION_LIMIT - finalIdStrings.length;

    if (needed > 0) {
        // Add the 2nd-degree users we just found to the exclusion list
        finalIdStrings.forEach(id => exclusionSet.add(id));
        const currentExclusionObjectIds = Array.from(exclusionSet)
                                        .map(id => new mongoose.Types.ObjectId(id));

        // 💡 CHANGE 3: Use the Connection collection to count followers in the aggregation
        const popularUsers = await Connection.aggregate([
            // 1. Group all connections by the user being FOLLOWED
            { $group: {
                _id: "$following", // The ID of the user being followed
                followersCount: { $sum: 1 } // Count how many times they appear
            } },
            
            // 2. Exclude users the current user is already connected to (1st, 2nd degree, or self)
            { $match: { _id: { $nin: currentExclusionObjectIds } } },
            
            // 3. Sort by the most followers
            { $sort: { followersCount: -1 } },
            
            // 4. Limit to the number we need
            { $limit: needed }
        ]);

        // Add the fallback user IDs to our final list
        const fallbackIds = popularUsers.map(user => user._id.toString());
        finalIdStrings = [...finalIdStrings, ...fallbackIds];
    }

    // --- Step 5: Fetch all user documents and re-sort (Logic remains the same) ---
    if (finalIdStrings.length === 0) {
        return [];
    }

    const finalObjectIds = finalIdStrings.map(id => new mongoose.Types.ObjectId(id));

    const finalUsers = await User.find({ _id: { $in: finalObjectIds } })
        .select('_id name profileImage headline') 
        .lean();

    const userMap = new Map(finalUsers.map(user => [user._id.toString(), user]));
    const sortedUsers = finalIdStrings.map(id => userMap.get(id)).filter(Boolean); 

    return sortedUsers;
};