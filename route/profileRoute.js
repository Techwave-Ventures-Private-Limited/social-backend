const express = require("express");
const router = express.Router();
const { uploadImageToCloudinary } = require("../utils/imageUploader");
const { auth } = require("../middleware/authMiddleware");
const User = require("../modules/user");

// POST /profile-image
router.post("/profile-image", auth, async (req, res) => {
  try {
    if (!req.files || !req.files.image) {
      return res.status(400).json({ success: false, message: "No image uploaded" });
    }
    const file = req.files.image;
    const userId = req.userId;
    const upload = await uploadImageToCloudinary(file, "profile_images");
    const imageUrl = upload.secure_url;
    const user = await User.findByIdAndUpdate(userId, { profileImage: imageUrl }, { new: true });
    return res.status(200).json({ success: true, message: "Profile image updated", profileImage: imageUrl, user });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
