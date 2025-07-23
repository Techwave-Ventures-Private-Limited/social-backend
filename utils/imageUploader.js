const cloudinary = require("cloudinary").v2

 uploadImageToCloudinary = async (file, folder, height, quality) => {
  const options = { folder }
  if(height){
    options.height = height;
  }
  if(quality){
    options.quality = quality;
  }
  options.resource_type = "auto"
  return await cloudinary.uploader.upload(file.tempFilePath, options)
}

const uploadMultipleImagesToCloudinary = async (files, folder, height, quality) => {
  const uploadPromises = files.map(file =>
    uploadImageToCloudinary(file, folder, height, quality)
  );

  const uploadedImages = await Promise.all(uploadPromises);
  return uploadedImages;
};

module.exports = { uploadMultipleImagesToCloudinary, uploadImageToCloudinary };
