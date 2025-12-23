const mongoose = require("mongoose");
const Post = require("../modules/post");
const { connect } = require("../config/dbonfig");

async function run() {
    try {
        connect();

        const result = await Post.updateMany(
            {
                $or: [
                    { engagementScore: { $exists: false } },
                    { lastEngagementAt: { $exists: false } }
                ]
            },
            [
                {
                    $set: {
                        // engagementScore default
                        engagementScore: {
                            $ifNull: ["$engagementScore", 0]
                        },

                        // lastEngagementAt fallback to createdAt or now
                        lastEngagementAt: {
                            $ifNull: [
                                "$lastEngagementAt",
                                { $ifNull: ["$createdAt", new Date()] }
                            ]
                        }
                    }
                }
            ]
        );

        console.log("Updated documents:", result.modifiedCount);
    } catch (err) {
        console.error("Migration failed:", err);
    } finally {
        await mongoose.connection.close();
        console.log("Database connection closed");
        process.exit(0);
    }
}

run();
