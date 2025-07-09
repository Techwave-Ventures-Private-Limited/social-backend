const User = require("../modules/user");

exports.followUser = async(req,res) => {
    try{

        const {userToFollowId} = req.body;
        const userId = req.userId;

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

        return res.status(200).json({
            success:true,
            message:"Follow sucessfull",
            body: user
        })

    } catch(err) {
        return res.status(500).json({
            success:false,
            mesasge:err.message
        })
    }
}