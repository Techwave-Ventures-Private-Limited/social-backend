const mongoose = require("mongoose");
const User = require("../modules/user");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });


function isSameDay(d1, d2) {
  if (!d1 || !d2) return false;
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}


(async () => {
  try {
    console.log("⏳ Running daily streak reset...");

    // IMPORTANT — replace with your MongoDB URL
    await mongoose.connect(process.env.MONGODB_URL);

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const users = await User.find();

    let resets = 0;

    for (const user of users) {
      if (
        user.lastStreakUpdate &&
        !isSameDay(today, user.lastStreakUpdate) &&
        !isSameDay(yesterday, user.lastStreakUpdate)
      ) {
        user.streak = 0;
        await user.save();
        resets++;
      }
    }

    console.log(`✅ Streak reset complete. Users reset: ${resets}`);
    mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error("❌ Cron Error:", err);
    process.exit(1);
  }
})();


// require("dotenv").config();
// const path = require("path");
// require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
// const mongoose = require("mongoose");
// const User = require("../modules/user");

// async function resetStreaks() {
//   try {
//     await mongoose.connect(process.env.MONGODB_URL);
//     console.log("Connected to Mongo");

//     const today = new Date();
//     const yesterday = new Date();
//     yesterday.setDate(today.getDate() - 1);

//     const users = await User.find();

//     for (let user of users) {
//       const last = user.lastStreakUpdate;
//       console.log(`Checking user: ${user._id}, last update: ${last}`);

//       if (!last) {
//         user.streak = 0;
//         await user.save();
//         continue;
//       }

//       const isSameDay = (d1, d2) =>
//         d1.getFullYear() === d2.getFullYear() &&
//         d1.getMonth() === d2.getMonth() &&
//         d1.getDate() === d2.getDate();

//       if (!isSameDay(today, last) && !isSameDay(yesterday, last)) {
//         console.log(`Reset streak for: ${user._id}`);
//         user.streak = 0;
//         await user.save();
//       }
//     }

//     console.log("Streak reset script completed");
//     process.exit(0);
//   } catch (err) {
//     console.error("Error:", err);
//     process.exit(1);
//   }
// }

// resetStreaks();
