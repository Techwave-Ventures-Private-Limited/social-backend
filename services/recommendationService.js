// controller/UserRecommendationController.js
const User = require('../modules/user'); // Adjust path as needed
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

  // --- Step 1: Get 1st Degree IDs and create an exclusion list ---
  // We will exclude the user and anyone they already follow.
  const currentUser = await User.findById(userId).select('following').lean();
  if (!currentUser) {
    throw new Error('Recommendation : User not found');
  }

  // Use a Set for fast O(1) lookups
  const exclusionSet = new Set(currentUser.following.map(id => id.toString()));
  exclusionSet.add(userId.toString());

  // --- Step 2: Find all 2nd-degree "follows-of-follows" ---
  const firstDegreeIds = currentUser.following;

  // If the user isn't following anyone, use the default seed list
  if (!firstDegreeIds || firstDegreeIds.length === 0) {
    console.log(`[Recommender] User ${userId} has no follows. Using default seed list.`);
    firstDegreeIds = DEFAULT_SEED_USER_IDS;
  }

  // Get the 'following' lists from all 1st-degree connections
  const firstDegreeUsers = await User.find({ _id: { $in: firstDegreeIds } })
    .select('following')
    .lean();

  // Flatten all 'follows-of-follows' into one array
  const potentialSecondDegreeIds = firstDegreeUsers.flatMap(user => user.following);

  // --- Step 3: Count and Rank 2nd-degree connections ---
  // We count occurrences to rank by "mutual" connections
  const idCounts = new Map();
  
  for (const id of potentialSecondDegreeIds) {
    const idStr = id.toString();
    // If the user is NOT in our exclusion list...
    if (!exclusionSet.has(idStr)) {
      // ...increment their count
      idCounts.set(idStr, (idCounts.get(idStr) || 0) + 1);
    }
  }

  // Sort by count (descending) to get the most relevant users first
  const rankedSecondDegreeIds = Array.from(idCounts.entries())
    .sort((a, b) => b[1] - a[1]) // Sort by count [1]
    .map(entry => entry[0]);    // Get just the ID [0]

  // Our final list of IDs to fetch
  let finalIdStrings = rankedSecondDegreeIds.slice(0, RECOMMENDATION_LIMIT);

  // --- Step 4: Handle Fallback (if we need more than 12) ---
  const needed = RECOMMENDATION_LIMIT - finalIdStrings.length;

  if (needed > 0) {
    // Add the 2nd-degree users we just found to the exclusion list
    // so the fallback query doesn't return the same people.
    finalIdStrings.forEach(id => exclusionSet.add(id));

    // Convert string IDs back to ObjectIds for the $nin aggregation
    const fallbackExclusionIds = Array.from(exclusionSet)
                                  .map(id => new mongoose.Types.ObjectId(id));

    // Find popular users, defined by follower count
    const popularUsers = await User.aggregate([
      // 1. Exclude all users we already know about
      { $match: { _id: { $nin: fallbackExclusionIds } } },
      
      // 2. Create a 'followersCount' field
      { $project: {
          _id: 1,
          followersCount: { $size: "$followers" } 
        }
      },
      
      // 3. Sort by the most followers
      { $sort: { followersCount: -1 } },
      
      // 4. Limit to the number we need
      { $limit: needed }
    ]);

    // Add the fallback user IDs to our final list
    const fallbackIds = popularUsers.map(user => user._id.toString());
    finalIdStrings = [...finalIdStrings, ...fallbackIds];
  }

  // --- Step 5: Fetch all user documents and re-sort ---
  if (finalIdStrings.length === 0) {
    return []; // No recommendations found
  }

  // Convert all string IDs to ObjectIds for the final query
  const finalObjectIds = finalIdStrings.map(id => new mongoose.Types.ObjectId(id));

  // Fetch the user documents
  const finalUsers = await User.find({ _id: { $in: finalObjectIds } })
    .select('_id name profileImage headline') // Only get the fields you need
    .lean();

  // We must re-sort the results. `User.find()` does not preserve the
  // order of the $in array.
  const userMap = new Map(finalUsers.map(user => [user._id.toString(), user]));
  const sortedUsers = finalIdStrings.map(id => userMap.get(id)).filter(Boolean); // .filter(Boolean) removes any undefined

  return sortedUsers;
};