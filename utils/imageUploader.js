const cloudinary = require("cloudinary").v2

const uploadImageToCloudinary = async (file, folder, height, quality, expiresAt) => {
  const options = { folder }
  if(height){
    options.height = height;
  }
  if(quality){
    options.quality = quality;
  }
  if (expiresAt) {
    options.context = {
      expires_at: new Date(expiresAt).toISOString()
    }
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

const uploadVideoToCloudinary = async (file, folder, quality, expiresAt) => {
  const options = {
    folder,
    resource_type: "video"
  };

  if (quality) {
    options.quality = quality;
  }
  if (expiresAt) {
    options.context = {
      expires_at: new Date(expiresAt).toISOString()
    }
  }

  return await cloudinary.uploader.upload(file.tempFilePath, options);
};


module.exports = { uploadMultipleImagesToCloudinary, uploadImageToCloudinary, uploadVideoToCloudinary };
