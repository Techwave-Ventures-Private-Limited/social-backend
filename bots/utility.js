const BotState = require("../modules/botState");

const COOLDOWN_MS = 3 * 60 * 60 * 1000;   // 3 hours
const MAX_RUNTIME_MS = 4 * 60 * 60 * 1000; // 4 hours

async function acquireLock(botType) {
    const now = new Date();

    await BotState.updateOne(
        { botType },
        { $setOnInsert: { botType } },
        { upsert: true }
    );

    const result = await BotState.findOneAndUpdate(
        {
            botType,
            $or: [
                { lockedAt: null },
                { lockedAt: { $lt: new Date(Date.now() - MAX_RUNTIME_MS) } }
            ],
            $or: [
                { lastRunAt: null },
                { lastRunAt: { $lt: new Date(Date.now() - COOLDOWN_MS) } }
            ]
        },
        {
            $set: {
                lockedAt: now,
                lastRunAt: now
            }
        },
        { new: true }
    );

    return !!result;
}

async function releaseLock(botType) {
    await BotState.updateOne(
        { botType },
        { $set: { lockedAt: null } }
    );
}

module.exports = {
    acquireLock,
    releaseLock,
    COOLDOWN_MS
};
