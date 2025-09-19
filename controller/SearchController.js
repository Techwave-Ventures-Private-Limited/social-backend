const User = require("../modules/user");
const Post = require("../modules/post");
const Community = require("../modules/community");
const { formatPost } = require("./PostController");

exports.searchAll = async (req, res) => {
  try {
    const { text } = req.params;
    const limit = parseInt(req.query.limit) || 5;
    const offset = parseInt(req.query.offset) || 0;
    const { type } = req.query; // type = "users", "posts", "community" or "all"
    const userId = req.userId;

    const user = await User.findById(userId);
    if(!user) {
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
    posts = formatPost(posts,user);

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

