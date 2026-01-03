const mongoose = require("mongoose");
const User = require("../modules/user");
const { buildSearchText, generateEmbedding } = require("../services/userService");
const { connect } = require("../config/dbonfig");

async function run() {
    try {


        connect();

        const users = await User.find({
            $or: [
                { embedding: { $exists: false } },
                { embedding: { $size: 0 } }
            ]
        })

        for (const user of users) {
            const searchText = buildSearchText(
                user,
                user?.about,
                user?.education[0],
                user?.experience[0]
            );

            if (!searchText) continue;

            user.searchText = searchText;
            user.embedding = await generateEmbedding(searchText);
            await user.save();
        }

        console.log("Backfill complete");
        process.exit(0);
    } catch (err) {
        console.error("Migration failed:", err);
    } finally {
        await mongoose.connection.close();
        console.log("Database connection closed");
        process.exit(0);
    }
}

run();
