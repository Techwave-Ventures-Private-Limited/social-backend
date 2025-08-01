const User = require("../modules/user");
const Post = require("../modules/post");
const { formatPost } = require("./PostController");

exports.searchAll = async (req, res) => {
  try {
    const { text } = req.params;
    const limit = parseInt(req.query.limit) || 5;
    const offset = parseInt(req.query.offset) || 0;
    const { type } = req.query; // type = "users", "posts", or "all"
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

    [users, posts] = await Promise.all(promises);
    posts = formatPost(posts,user);

    return res.status(200).json({
      success: true,
      users,
      posts,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};



