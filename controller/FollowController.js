const User = require("../modules/user");
const { createNotification } = require('../utils/notificationUtils');
const { createFollowship } = require("../services/followService");
const Connection = require("../modules/connection");

exports.followUser = async(req,res) => {
    try{
        const {userToFollowId} = req.body;
        const userId = req.userId;

        if(!userToFollowId) {
            return res.status(400).json({
                success: false,
                message: "User to follow is not defined"
            });
        }

        // Call the reusable service
        await createFollowship(userId, userToFollowId);

        return res.status(200).json({
            success:true,
            message:"Follow successfull",
        });

    } catch(err) {
        // Our service throws errors if users aren't found
        return res.status(500).json({
            success:false,
            mesasge:err.message
        });
    }
};

exports.unFollowUser = async(req,res) => {
    try{

        const {userToUnFollowId} = req.body;
        const userId = req.userId;

        if(!userToUnFollowId) {
            return res.status(400).json({
                success:false,
                message:"User to Unfollow is not defined"
            })
        }

        const user = await User.findById(userId);
        const userToFollow = await User.findById(userToUnFollowId);

        if(!userToFollow) {
            return res.status(400).json({
                success:false,
                message:"User to unfollow does not exists"
            })
        }

        //user.following.pull(userToFollow._id);
        //await user.save();

        //userToFollow.followers.pull(user._id);
        //await userToFollow.save();

        const isPresent = await Connection.findOne({follower : user, following: userToFollow});
        if (!isPresent) {
            return res.status(200).json({
                success: true,
                message: "Already Unfollowed"
            })
        }

        await Connection.findByIdAndDelete(isPresent._id);

        user.followingCount = user.followingCount - 1;
        userToFollow.followerCount = userToFollow.followerCount - 1;

        await Promise.all([
            user.save(),
            userToFollow.save()
        ]);

        return res.status(200).json({
            success:true,
            message:"UnFollow sucessfull",
            body: user
        })

    } catch(err) {
        return res.status(500).json({
            success:false,
            mesasge:err.message
        })
    }
}
