const User = require("../modules/user");

// Helper function (same as before)
function isSameDay(d1, d2) {
  if (!d1 || !d2) return false;
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
}

exports.checkStreak = async (req, res, next) => {
  try {
    // Assuming your auth middleware adds 'userId' to 'req'
    if (!req.userId) {
      return next(); 
    }

    const user = await User.findById(req.userId);
    if (!user || user.streak === 0) {
      return next(); // No user or no streak to check
    }

    const today = new Date();
    const lastUpdate = user.lastStreakUpdate;

    // If lastUpdate is null, streak should be 0 anyway, but we check
    if (!lastUpdate) {
      user.streak = 0;
      await user.save();
      return next();
    }

    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    // If the last update was NOT today and NOT yesterday, the streak is broken.
    if (!isSameDay(today, lastUpdate) && !isSameDay(yesterday, lastUpdate)) {
      user.streak = 0;
      await user.save();
    }
    
    next();
  } catch (error) {
    console.error("Streak Check Error:", error.message);
    next(); // Always call next() so the app doesn't hang
  }
};