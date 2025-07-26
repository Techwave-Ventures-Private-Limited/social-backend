const News = require("../modules/news-articles");

exports.getNews = async(req,res) => {
    try {
        const limit = req.query.limit || 10;
        const category = req.query.category || "";

        let news ;
        if (category !== "") {
            news = await News.find({
                category : {$in: [category]}
            }).limit(limit).sort({timestamp : -1}); 
        } else {
            news = await News.find().limit(limit).sort({timestamp: -1});
        }

        return res.status(200).json({
            success: true,
            message: "News fetched successfully",
            body: news
        });

    } catch(err) {
        return res.status(500).json({
            success: false,
            message: err.message
        })
    }
}

