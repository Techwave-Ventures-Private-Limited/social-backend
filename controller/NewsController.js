const News = require("../modules/news-articles");
const User = require("../modules/user");

exports.getNews = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;
    const category = req.query.category || "";

    let news;
    if (category !== "") {
      news = await News.find({
        category: { $in: [category] }
      }).skip(offset).limit(limit).sort({ timestamp: -1 });
    } else {
      news = await News.find()
        .skip(offset)
        .limit(limit)
        .sort({ timestamp: -1 });
    }

    const userId = req.userId;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User not found"
      });
    }

    const updatedNews = news.map((item) => {
      const isLiked = user.likedNews?.includes(item._id);
      const isSaved = user.savedNews?.includes(item._id);
      return {
        ...item._doc,
        isLiked,
        isSaved
      };
    });

    return res.status(200).json({
      success: true,
      message: "News fetched successfully",
      body: updatedNews
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

exports.toggleLikeNews = async (req, res) => {
  try {
    const newsId = req.params.newsId;
    const userId = req.userId;

    if (!newsId) {
      return res.status(400).json({
        success: false,
        message: "NewsId is required"
      });
    }

    const user = await User.findById(userId);
    const hasLiked = user.likedNews.includes(newsId);

    await User.findByIdAndUpdate(userId, {
      [hasLiked ? '$pull' : '$push']: { likedNews: newsId }
    });

    const updatedNews = await News.findByIdAndUpdate(
      newsId,
      { $inc: { likes: hasLiked ? -1 : 1 } },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: hasLiked ? "News unliked" : "News liked",
      body: updatedNews
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

exports.toggleSaveNews = async (req, res) => {
  try {
    const newsId = req.params.newsId;
    const userId = req.userId;

    if (!newsId) {
      return res.status(400).json({
        success: false,
        message: "NewsId is required"
      });
    }

    const user = await User.findById(userId);
    const hasSaved = user.savedNews.includes(newsId);

    await User.findByIdAndUpdate(userId, {
      [hasSaved ? '$pull' : '$push']: { savedNews: newsId }
    });

    return res.status(200).json({
      success: true,
      message: hasSaved ? "News unsaved" : "News saved"
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

exports.getSavedNews = async(req,res) => {
    try{

        const userId = req.userId;

        const user = await User.findById(userId).populate("savedNews");
        const likedNewsIds = new Set(user.likedNews.map(news => news._id.toString()));

        const news = user.savedNews.map(article => {
          const plainArticle = article.toObject(); // clean the Mongoose internals
          return {
            ...plainArticle,
            isSaved: true,
            isLiked: likedNewsIds.has(article._id.toString()),
          };
        });
    
        return res.status(200).json({
            success: true,
            body: news
        })

    } catch(err) {
        return res.status(500).json({
            success: false,
            message: err.message
        })
    }
}

