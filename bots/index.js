const User = require("../modules/user");
const { runBot } = require("./runner");
const { acquireLock, releaseLock, COOLDOWN_MS } = require("./utility");
const {connect} = require("../config/dbonfig");

const BATCH_SIZE = 5;
const ENABLE_BOTS = process.env.ENABLE_BOTS === "true";

async function startBotsByType(botType) {
    if (!ENABLE_BOTS) {
        console.log("Bots are disabled");
        return;
    }

    const locked = await acquireLock(botType);
    if (!locked) {
        console.log(`${botType} bots skipped (cooldown or running)`);
        return;
    }

    console.log(`Starting ${botType} bots`);

    try {
        const bots = await User.find({
            ib: true,
            bt: botType
        });

        for (let i = 0; i < bots.length; i += BATCH_SIZE) {
            const batch = bots.slice(i, i + BATCH_SIZE);

            console.log(
                `Running ${botType} batch ${Math.floor(i / BATCH_SIZE) + 1}`
            );

            for (const bot of batch) {
                try {
                    await runBot(bot);
                } catch (err) {
                    console.error(
                        `${botType} bot failed`,
                        bot.name,
                        err.message
                    );
                }
            }

            if (i + BATCH_SIZE < bots.length) {
                await new Promise(res => setTimeout(res, COOLDOWN_MS));
            }
        }
    } finally {
        await releaseLock(botType);
        console.log(`${botType} bots finished`);
    }
}

async function startAllBots() {
    startBotsByType("POST");
    startBotsByType("COMMENT");
    startBotsByType("LIKE");
}

module.exports = { startAllBots };
