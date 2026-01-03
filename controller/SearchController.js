const User = require("../modules/user");
const Post = require("../modules/post");
const Community = require("../modules/community");
const { formatPost } = require("./PostController");
const { generateEmbedding, generatePostEmbedding } = require("../services/userService");

exports.searchAll = async (req, res) => {
  try {
    const { text } = req.params;
    const limit = parseInt(req.query.limit) || 5;
    const offset = parseInt(req.query.offset) || 0;
    const { type } = req.query; // type = "users", "posts", "community" or "all"
    const userId = req.userId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User not found"
      })
    }

    if (!text || text.length <= 3) {
      return res.status(400).json({
        success: false,
        message: "Search text must be at least 4 characters long.",
      });
    }

    const promises = [];
    let users = [], posts = [];

    if (type === "users" || type === "all") {
      promises.push(
        User.find({ name: { $regex: text, $options: "i" } })
          .limit(limit)
          .skip(offset)
      );
    } else {
      promises.push(Promise.resolve([]));
    }

    if (type === "posts" || type === "all") {
      promises.push(
        Post.find({ discription: { $regex: text, $options: "i" } })
          .populate({
            path: 'userId',
            model: 'User',
            populate: [
              { path: 'about', model: 'About' },
              { path: 'education', model: 'Education' },
              { path: 'experience', model: 'Experience' }
            ]
          })
          .populate('comments').limit(limit).skip(offset)

      );
    } else {
      promises.push(Promise.resolve([]));
    }

    if (type === "community" || type === "all") {
      promises.push(
        Community.find({ name: { $regex: text, $options: "i" }, isPrivate: false })
          .populate('owner', 'name profileImage')
          .populate('members', 'name profileImage')
          .lean()
          .then(communities => {
            return communities.map(community => ({
              ...community,
              isUserMember: userId
                ? community.members.some(member => member._id.toString() === userId)
                : false,
              userRole: userId ? getUserRoleInCommunity(community, userId) : null
            }));
          })
      );
    } else {
      promises.push(Promise.resolve([]));
    }

    [users, posts, communities] = await Promise.all(promises);
    posts = formatPost(posts, user);

    return res.status(200).json({
      success: true,
      users,
      posts,
      communities
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

function getUserRoleInCommunity(community, userId) {
  if (community.owner.toString() === userId) return 'owner';
  if (community.admins.some(admin => admin._id ? admin._id.toString() === userId : admin.toString() === userId)) return 'admin';
  if (community.moderators.some(mod => mod._id ? mod._id.toString() === userId : mod.toString() === userId)) return 'moderator';
  if (community.members.some(member => member._id ? member._id.toString() === userId : member.toString() === userId)) return 'member';
  return null;
}

exports.searchUsers = async (req, res) => {
  try {
    const { q, category } = req.query;

    if (!q || !q.trim()) {
      return res.status(400).json({
        success: false,
        message: "Search query (q) is required"
      });
    }

    const limit = Math.min(parseInt(req.query.limit) || 20, 50);

    // 1️⃣ Generate query embedding
    const queryEmbedding = await generateEmbedding(q);

    // 2️⃣ Build aggregation pipeline
    const pipeline = [
      {
        $vectorSearch: {
          index: "user_demo", // 🔴 must match Atlas index name
          path: "embedding",
          queryVector: queryEmbedding,
          numCandidates: 200,
          limit
        }
      },

      // 3️⃣ Optional category filter
      ...(category ? [{
        $match: { category }
      }] : []),

      // 4️⃣ Shape response
      {
        $project: {
          name: 1,
          headline: 1,
          bio: 1,
          profileImage: 1,
          category: 1,
          followerCount: 1,
          score: { $meta: "vectorSearchScore" }
        }
      }
    ];

    // 5️⃣ Execute search
    const users = await User.aggregate(pipeline);

    return res.status(200).json({
      success: true,
      count: users.length,
      users
    });

  } catch (err) {
    console.error("User search failed:", err);
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

exports.searchPost = async (req, res) => {
    try {
        const { q, category, limit = 20 } = req.query;

        const queryEmbedding = await generatePostEmbedding(
            category || "",
            q
        );

        const pipeline = [
            {
                $vectorSearch: {
                    index: "post_vector_index",
                    path: "embedding",
                    queryVector: queryEmbedding,
                    numCandidates: 100,
                    limit: Number(limit),
                    filter: {
                        isDeleted: false,
                        ...(category && { category })
                    }
                }
            },
            {
                $project: {
                    embedding: 0
                }
            }
        ];

        const posts = await Post.aggregate(pipeline);
        res.json({ success: true, posts });
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        })
    }
}