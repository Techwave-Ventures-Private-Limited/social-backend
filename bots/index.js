const User = require("../modules/user");
const { runBot } = require("./runner");

const BATCH_SIZE = 5;
const BATCH_DELAY_MS = 3 * 60 * 60 * 1000; // 3 hours

async function startPostBots() {
    const postBots = await User.find({
        ib: true,
        bt: "POST"
    });
    console.log("Staring bot ")
    let index = 0;

    const runBatch = async () => {
        const batch = postBots.slice(index, index + BATCH_SIZE);

        if (batch.length === 0) return;

        console.log(`Running post bot batch ${index / BATCH_SIZE + 1}`);

        for (const bot of batch) {
            try {
                await runBot(bot);
            } catch (err) {
                console.error("Bot failed:", bot.name, err.message);
            }
        }

        index += BATCH_SIZE;

        setTimeout(runBatch, BATCH_DELAY_MS);
    };

    runBatch();
}

module.exports = { startPostBots };
