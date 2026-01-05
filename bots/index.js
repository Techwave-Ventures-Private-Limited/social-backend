const User = require("../modules/user");
const { runBot } = require("./runner");
const { acquireLock, releaseLock, COOLDOWN_MS } = require("./utility");
const { connect } = require("../config/dbonfig");

const BATCH_SIZE = 5;
const ENABLE_BOTS = process.env.ENABLE_BOT === "true";
const BOT_LOCK_KEY = "GLOBAL_BOT_RUN";

async function startAllBots() {
    if (!ENABLE_BOTS) {
        console.log("Bots are disabled");
        return;
    }

    await connect();

    const locked = await acquireLock(BOT_LOCK_KEY);
    if (!locked) {
        console.log("Bots skipped (cooldown or already running)");
        return;
    }

    console.log("🚀 Starting unified bot run");

    try {
        const bots = await User.aggregate([
            { $match: { ib: true ,bt : "CATEGORY"} },
            { $sample: { size: 20 } }
        ])

        for (let i = 0; i < bots.length; i += BATCH_SIZE) {
            const batch = bots.slice(i, i + BATCH_SIZE);

            console.log(`Running bot batch ${Math.floor(i / BATCH_SIZE) + 1}`);

            for (const bot of batch) {
                try {
                    await runBot(bot);
                } catch (err) {
                    console.error(
                        "Bot failed",
                        bot.name,
                        err.message
                    );
                }
            }

            if (i + BATCH_SIZE < bots.length) {
                await new Promise(res => setTimeout(res, 1000)); // small gap
            }
        }
    } finally {
        await releaseLock(BOT_LOCK_KEY);
        console.log("✅ Bot run finished");
    }
}

module.exports = { startAllBots };
