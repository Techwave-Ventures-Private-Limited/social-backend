const User = require("../modules/user");

const REFERRAL_REWARD = 10;

exports.applyReferral = async (newUserId, referralCode) => {
  if (!referralCode) return;

  const referrer = await User.findOne({ referralCode });

  if (!referrer) return;

  if (referrer._id.equals(newUserId)) return;

  const newUser = await User.findById(newUserId);
  if (newUser.referredBy) return;

  await User.findByIdAndUpdate(referrer._id, {
    $inc: { points: REFERRAL_REWARD },
  });

  await User.findByIdAndUpdate(newUserId, {
    $set: { referredBy: referrer._id },
    $inc: { points: REFERRAL_REWARD },
  });
};

exports.checkReferralCode = async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: "Referral code required",
      });
    }

    const user = await User.findOne({ referralCode: code });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Invalid referral code",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Referral code valid",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
