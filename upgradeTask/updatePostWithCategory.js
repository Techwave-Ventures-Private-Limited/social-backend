const mongoose = require("mongoose");
const Post = require("../modules/post");
const { connect } = require("../config/dbonfig");

async function run() {
    try {
        //await mongoose.connect(process.env.MONGO_URI);
        connect();
        const result = await Post.updateMany(
            {
                $or: [
                    { category: { $exists: false } },
                    { category: null },
                    { category: "" }
                ]
            },
            {
                $set: { category: "Technology & IT" }
            }
        );

        console.log("Updated docs:", result.modifiedCount);
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
