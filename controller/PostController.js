const Post = require("../modules/post");
const User = require("../modules/user");
const {uploadImageToCloudinary} = require("../utils/imageUploader");
const Comment = require("../modules/comments");

exports.createPost = async(req,res) => {
    try{

        const {discription, media, postType} = req.body;
        const userId = req.userId;

        const file = req.files.media;

        if(!discription || !postType) {
            return res.status(400).json({
                success: false,
                message: "Discription and postType are required"
            })
        }

        const user = await User.findById(userId);
        if(!user) {
            return res.status(400).json({
                success:false,
                message : "User does not exists"
            })
        }
        
        const image = await uploadImageToCloudinary(
            file,
            process.env.FOLDER_NAME,
            1000,
            1000
        )
        const imageUrl = image.secure_url;

        const createdPost = await Post.create({discription, media  : imageUrl, postType, userId});

        user.posts.push(createdPost._id);
        await user.save();

        return res.status(200).json({
            success: true,
            message : "Post Created Successfully",
            body : createdPost
        })

    } catch(err) {
        return res.status(500).json({
            success: false,
            message: err.message
        })
    }
} 

exports.getPost = async(req,res) => {
    try {

        const {postId} = req.params;

        if(!postId) {
            return res.status(400).json({
                success:false,
                message : "PostId required"
            })
        }

        const post = await Post.findById(postId).populate("comments");

        return res.status(200).json({
            success: true,
            message: "Post found",
            body : post
        })

    } catch(err) {
        return res.status(500).json({
            success: false,
            message : err.message
        })
    }
}

exports.getUserPosts = async(req,res) => {
    try{

        const userId = req.userId;

        if(!userId) {
            return res.status(400).json({
                success:false,
                message:"Userid required"
            })
        }

        const posts = await Post.find({userId : userId});

        return res.status(200).json({
            success:true,
            mesasge:"Post found",
            body: posts
        })

    } catch(err) {
        return res.status(500).json({
            success: false,
            message : err.message
        })
    }
}

exports.likePost = async(req,res) => {
    try{

        const postId = req.body.postId;
        const post = await  Post.findById(postId);

        if(!post) {
            return res.status(400).json({
                success:false,
                message:"Post not found"
            })
        }

        post.likes = post.likes + 1;
        await post.save();

        return res.status(200).json({
            success:true,
            message:"Post liked",
            body: post
        })

    }  catch(err) {
        return res.status(500).json({
            success:false,
            message:err.message
        })
    }
}

exports.commentPost = async(req,res) =>{
    try{
        const {postId, text } = req.body;

        if(!postId || !text) {
            return res.json({
                success:false,
                message:"PostId and text required"
            })
        }

        const post = await Post.findById(postId);
        if(!post) {
            return res.status(400).json({
                success:false,
                message:"Post Not found"
            })
        }

        const comment = await Comment.create({text, postId});

        post.comments.push(comment._id);
        await post.save();

        return res.status(200).json({
            success:true,
            message:"Comment created ",
            body: comment,
            post : post
        })

    } catch(err){
        return res.status(500).json({
            success:false,
            message:err.message
        })
    }
}

exports.savePost = async(req,res) => {
    try{

        const userId = req.userId;
        const postId = req.body.postId;

        const post = await Post.findById(postId);
        const user = await User.findById(userId);

        if(!user) {
            return res.status(400).json({
                success:false,
                message:"User does not exists"
            })
        } 

        
        if(!post) {
            return res.status(400).json({
                success:false,
                message:"Post does not exists"
            })
        } 

        user.savedPost.push(post._id);
        await user.save();

        return res.status(200).json({
            success:true,
            message:"Post saved",
            body : user
        })

    } catch(err) {
        return res.status(500).json({
            success:false,
            message:err.message
        })
    }
}

exports.getCommentsForPost = async(req,res) => {
    try{
        const  {postId} = req.params;

        if(!postId) {
            return res.status(400).json({
                success:false,
                message:"PostId required"
            })
        }

        const comments = await Comment.find({postId: postId});

        return res.status(200).json({
            success:true,
            message:"Comments found",
            body: comments
        })
    } catch(err) {
        return res.status(500).json({
            success:false,
            message:err.message
        })
    }
}

exports.getAllPosts = async(req,res) => {
    try{

        const filter = req.query.filter;
        let posts ;
        if(filter == 0) {
            posts = await Post.find();
        }
        else if(filter == 1) {
            posts = await Post.find().sort({ createdAt: -1 }) 
        }
        return res.status(200).json({
            success:true,
            body : posts
        })

    } catch(err) {
        return res.status(500).json({
            success:false,
            message:err.message
        })
    }
} 