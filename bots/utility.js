const BotState = require("../modules/botState");

const HOUR = 60 * 60 * 1000;

const COOLDOWN_MS = 12 * HOUR;     // 12 hours
const MAX_RUNTIME_MS = 6 * HOUR;  // safety unlock after 6 hours

async function acquireLock(lockKey) {
    const now = new Date();

    await BotState.updateOne(
        { botType: lockKey },
        { $setOnInsert: { botType: lockKey } },
        { upsert: true }
    );

    const result = await BotState.findOneAndUpdate(
        {
            botType: lockKey,
            $and: [
                {
                    $or: [
                        { lockedAt: null },
                        { lockedAt: { $lt: new Date(Date.now() - MAX_RUNTIME_MS) } }
                    ]
                },
                {
                    $or: [
                        { lastRunAt: null },
                        { lastRunAt: { $lt: new Date(Date.now() - COOLDOWN_MS) } }
                    ]
                }
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

async function releaseLock(lockKey) {
    await BotState.updateOne(
        { botType: lockKey },
        { $set: { lockedAt: null } }
    );
}

module.exports = {
    acquireLock,
    releaseLock,
    COOLDOWN_MS
};
