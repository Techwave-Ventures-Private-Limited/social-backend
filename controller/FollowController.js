const User = require("../modules/user");
const { createNotification } = require('../utils/notificationUtils');

exports.followUser = async(req,res) => {
    try{

        const {userToFollowId} = req.body;
        // console.log("userToFollowId", userToFollowId);
        const userId = req.userId;
        // console.log("userId", userId);

        if(!userToFollowId) {
            return res.status(400).json({
                success:false,
                message:"User to follow is not defined"
            })
        }

        const user = await User.findById(userId);
        const userToFollow = await User.findById(userToFollowId);

        if(!userToFollow) {
            return res.status(400).json({
                success:false,
                message:"User to follow does not exists"
            })
        }

        user.following.push(userToFollow._id);
        await user.save();

        userToFollow.followers.push(user._id);
        await userToFollow.save();

        await createNotification(userToFollow._id, userId, 'follow');

        return res.status(200).json({
            success:true,
            message:"Follow successfull",
            body: user
        })

    } catch(err) {
        return res.status(500).json({
            success:false,
            mesasge:err.message
        })
    }
}

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

        user.following.pull(userToFollow._id);
        await user.save();

        userToFollow.followers.pull(user._id);
        await userToFollow.save();

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
