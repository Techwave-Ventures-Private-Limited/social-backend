const mongoose = require("mongoose");
const User = require("../modules/user");
const generateReferralCode = require("../utils/generateCode");
const { connect } = require("../config/dbonfig");

async function upgradeUsers() {
    await connect();
    
    const users = await User.find({
        $or: [
            { referralCode: { $exists: false } },
            { referralCode: null },
        ],
    });

    for (const user of users) {
        let code;
        let exists = true;

        while (exists) {
            code = generateReferralCode();
            exists = await User.exists({ referralCode: code });
        }

        user.referralCode = code;
        user.points = user.points || 0;
        await user.save();
    }

    console.log(`Updated ${users.length} users`);
    process.exit(0);
}

upgradeUsers();
