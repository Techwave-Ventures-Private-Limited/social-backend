const User = require("../modules/user");
const { runBot } = require("./runner");

const BATCH_SIZE = 5;
const BATCH_DELAY_MS =  3 * 60 * 60 * 1000; // 3 hours

async function startBotsByType(botType) {
    const bots = await User.find({
        ib: true,
        bt: botType
    });

    console.log(`Starting ${botType} bots`);

    let index = 0;

    const runBatch = async () => {
        const batch = bots.slice(index, index + BATCH_SIZE);

        if (batch.length === 0) {
            console.log(`${botType} bots completed`);
            index = 0;
            setTimeout(runBatch, BATCH_DELAY_MS);
            return;
        }

        console.log(
            `Running ${botType} bot batch ${Math.floor(index / BATCH_SIZE) + 1}`
        );

        for (const bot of batch) {
            try {
                await runBot(bot);
            } catch (err) {
                console.error(`${botType} bot failed:`, bot.name, err.message);
            }
        }

        index += BATCH_SIZE;
        setTimeout(runBatch, BATCH_DELAY_MS);
    };

    runBatch();
}

async function startAllBots() {
    await startBotsByType("POST");
    await startBotsByType("COMMENT");
}

module.exports = { startAllBots };
