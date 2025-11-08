// --- Load Environment Variables ---
require('dotenv').config();

// --- Core Modules ---
const { Worker } = require('bullmq');
const database = require('./config/dbonfig'); // We need DB connection

// --- Import Logic ---
const { QUEUE_NAME } = require('./config/queue');
const { redisClient } = require('./config/redis');
const { createFollowship } = require('./services/followService'); // The function we created

// --- Connect to Database ---
database.connect();

console.log(`[Worker] Starting worker for queue: "${QUEUE_NAME}"`);

// --- Create the Worker ---
const worker = new Worker(QUEUE_NAME, async (job) => {
    // This function is called for every job
    console.log(`[Worker] Processing job: ${job.name} (ID: ${job.id})`);

    const { newUserId } = job.data;

    try {
        if (job.name === 'new-user-follows-founders') {
            const { usersToFollowIds } = job.data;
            console.log(`[Worker] Job: ${newUserId} will follow ${usersToFollowIds.length} founders.`);
            for (const cofounderId of usersToFollowIds) {
                await createFollowship(newUserId, cofounderId);
            }
        
        } else if (job.name === 'founders-follow-new-user') {
            const { followersIds } = job.data;
            console.log(`[Worker] Job: ${followersIds.length} founders will follow ${newUserId}.`);
            for (const cofounderId of followersIds) {
                await createFollowship(cofounderId, newUserId);
            }
        }

        console.log(`[Worker] Completed job: ${job.name} (ID: ${job.id})`);
        return { success: true };

    } catch (error) {
        console.error(`[Worker] FAILED job: ${job.name} (ID: ${job.id})`, error);
        // Throwing an error will cause BullMQ to retry the job
        throw error;
    }

// --- THIS IS THE UPDATED LINE ---
}, { connection: redisClient }); // <-- Use the imported shared client

// --- Worker Event Listeners (for logging) ---
worker.on('completed', (job, result) => {
    console.log(`[Worker-Event] Job ${job.id} completed with result:`, result);
});

worker.on('failed', (job, err) => {
    console.error(`[Worker-Event] Job ${job.id} failed with error:`, err.message);
});