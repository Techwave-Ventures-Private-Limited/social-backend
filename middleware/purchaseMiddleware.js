const Purchase = require("../modules/purchase");
const User = require("../modules/user");

exports.requireActivePlan = async (req, res, next) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId);

    if (!user?.activePurchase) {
      return res.status(403).json({
        success: false,
        message: "Premium plan required",
      });
    }

    const purchase = await Purchase.findById(user.activePurchase)
      .populate("planId");

    if (
      !purchase ||
      purchase.status !== "active" ||
      purchase.endDate <= new Date()
    ) {
      return res.status(403).json({
        success: false,
        message: "Plan expired or inactive",
      });
    }

    req.purchase = purchase;
    req.plan = purchase.planId;
    next();
  } catch (err) {
    console.error("Plan middleware error:", err);
    res.status(500).json({
      success: false,
      message: "Subscription check failed",
    });
  }
};

exports.requireFeature = (featureKey) => {
  return (req, res, next) => {
    const feature = req.plan.features.find(
      f => f.key === featureKey
    );

    if (!feature || !feature.value) {
      return res.status(403).json({
        success: false,
        message: "Feature not available in your plan",
      });
    }

    next();
  };
};

exports.blockMultiplePlans = async (req, res, next) => {
  try {
    const userId = req.userId;

    const user = await User.findById(userId).select("activePurchase");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!user.activePurchase) {
      return next();
    }

    const purchase = await Purchase.findById(user.activePurchase);

    if (
      !purchase ||
      purchase.status !== "active" ||
      purchase.endDate <= new Date()
    ) {
      await User.findByIdAndUpdate(userId, {
        $set: { activePurchase: null },
      });
      return next();
    }

    return res.status(409).json({
      success: false,
      message: "You already have an active plan",
    });

  } catch (error) {
    console.error("Block plan middleware error:", error);
    return res.status(500).json({
      success: false,
      message: "Subscription validation failed",
    });
  }
};
