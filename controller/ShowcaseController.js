const User = require("../modules/user");
const Showcase = require("../modules/showcase");
const { uploadMultipleImagesToCloudinary, uploadImageToCloudinary } = require("../utils/imageUploader");

exports.createShowcase = async(req,res) => {
    try {

        const userId = req.userId;
        let logo = req.files && req.files.logo;
        let bannerImage = req.files && req.files.bannerImage;
        let images = req.files && req.files.images;
        let imagesUrls;
        if (images) {
            images = Array.isArray(images) ? images : [images];
            const uploadedImages = await uploadMultipleImagesToCloudinary(
                images,
                process.env.FOLDER_NAME,
                1000,
                1000
            )
            imagesUrls = uploadedImages.map(img => img.secure_url);
        }
        let logoUrl = "";
        if (logo) {
            const uploadedLogo = await uploadImageToCloudinary(logo, process.env.FOLDER_NAME, 1000, 1000);
            logoUrl = uploadedLogo.secure_url;
        }

        let bannerImageUrl = "";
        if (bannerImage) {
            const uploadedBannerImage = await uploadImageToCloudinary(bannerImage, process.env.FOLDER_NAME, 1000, 1000);
            bannerImageUrl = uploadedBannerImage.secure_url;
        }

        const {category, projectTitle, tagline, description, problem, solution, revenueModel, demoVideoLink, tags, projectLinks} = req.body;

        const createdShowcase = await Showcase.create({
            userId,
            logo: logoUrl,
            images: imagesUrls,
            bannerImageUrl,
            category,
            projectTitle,
            tagline,
            description,
            problem,
            solution,
            revenueModel,
            demoVideoLink,
            tags,
            projectLinks
        });

        return res.status(200).json({
            success: true,
            message: "Showcase created successfully",
            body: createdShowcase
        })

    } catch(err) {
        return res.status(500).json({
            success: false,
            message: err.message
        })
    }
}

exports.getShowcases = async(req,res) => {
    try {

        const showcases = await Showcase.find();
        
        return res.status(200).json({
            success: true,
            message: "Showcase found",
            body: showcases
        })

    } catch(err) {
        return res.status(500).json({
            success: false,
            message: err.message
        })
    }
}

exports.getUserShowcase = async(req,res) => {
    try {
        const userId = req.userId;

        const showcases = await Showcase.find({userId : userId});
        
        return res.status(200).json({
            success: true,
            message: "Showcase found",
            body: showcases
        })

    } catch(err) {
        return res.status(500).json({
            success: false,
            message: err.message
        })
    }
}
