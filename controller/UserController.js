const User = require("../modules/user");

exports.getUser = async(req,res) => {
    try{
        const userId = req.userId;

        if(!userId) {
            return res.status(400).json({
                success:false,
                message:"Unauthorized request"
            })
        } 

        const user = await User.findById(userId).lean();

        if(!user) {
            return res.status(402).json({
                success:false,
                message:"User not found"
            })
        }

        return res.status(200).json({
            success:true,
            message:"User found",
            body: user
        })

    } catch(err) {
        return res.status(500).json({
            success: false,
            message: err.message
        })
    }
}

exports.updateUser = async(req,res) => {
    try{

        const userId = req.userId;
        console.log(userId)
        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(404).json({
                success:false,
                message:`User does not exists with userId : ${userId}`
            })
        }

        const updatedUser = await User.findByIdAndUpdate(userId, req.body, { new: true });

        return res.status(200).json({
            success: true,
            message:'User updated successfully',
            body: updatedUser
        })

    } catch(err) {
        return res.status(500).json({
            success:false,
            message: err.message
        })
    }
}


