// config/redis.js
const IORedis = require('ioredis');

// 1. Define your single config object from .env
const redisConfig = {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || null,
    maxRetriesPerRequest: null,
};

// 2. Create the main, "command" client
// This client will be used for BullMQ and as the Socket.IO "publisher"
const redisClient = new IORedis(redisConfig);

// 3. Create the dedicated "subscriber" client
// This is required by the Socket.IO adapter
const subClient = redisClient.duplicate();

// 4. Add error handling
redisClient.on('error', (err) => {
    console.error('[Redis Client Error]', err);
});
subClient.on('error', (err) => {
    console.error('[Redis Sub Client Error]', err);
});

console.log('[Redis] Clients initialized.');

// 5. Export the clients for the rest of your app
module.exports = {
    redisClient,
    subClient,
};