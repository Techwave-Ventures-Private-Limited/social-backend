const mongoose = require("mongoose");
const User = require("../modules/user");
const { connect } = require("../config/dbonfig");

async function run() {
  try {
    connect();

    console.log("Connected to database");

    const result = await User.updateMany(
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

    console.log("Users updated with default category:", result.modifiedCount);

  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await mongoose.connection.close();
    console.log("Database connection closed");
    process.exit(0);
  }
}

run();
