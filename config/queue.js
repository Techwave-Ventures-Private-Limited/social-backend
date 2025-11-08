// config/queue.js
const { Queue } = require('bullmq');

// --- Import the main client ---
const { redisClient } = require('./redis'); // <-- THE CHANGE

const QUEUE_NAME = 'FollowQueue';

const followQueue = new Queue(QUEUE_NAME, {
    // --- Use the imported client ---
    connection: redisClient // <-- THE CHANGE
});

console.log(`[BullMQ] Queue "${QUEUE_NAME}" initialized.`);

module.exports = {
    followQueue,
    QUEUE_NAME,
};