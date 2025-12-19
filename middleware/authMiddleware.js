const jwt = require("jsonwebtoken");
require("dotenv").config();
const User = require("../modules/user");

exports.auth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        //console.log("In aouth")
        if (authHeader && authHeader.startsWith("Bot ")) {
            const botKey = authHeader.split(" ")[1];
            //console.log(botKey, authHeader)
            const botUser = await User.findOne({
                bk: botKey,
                ib: true
            });

            if (!botUser) {
                return res.status(401).json({
                    success: false,
                    message: "Invalid bot token"
                });
            }

            req.userId = botUser._id;
            req.ib = true;
            return next();
        }

        const token =
            req.headers.token ||
            (authHeader && authHeader.startsWith("Bearer ")
                ? authHeader.split(" ")[1]
                : null);

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Token is missing"
            });
        }

        try {
            const decode = jwt.verify(token, process.env.JWT_SECRET);
            req.userId = decode.id;
            req.ib = false;
        } catch (err) {
            return res.status(401).json({
                success: false,
                message: "Token is invalid"
            });
        }

        next();
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
};
