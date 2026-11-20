
const redis = require('redis');

const redisClient = redis.createClient({
    url: process.env.REDIS_HOST,
    socket: {
        connectTimeout: 3000,
        reconnectStrategy: (retries) => {
            if (retries >= 3) {
                console.error('Redis: Maximum reconnection attempts reached');
                return false;
            }

            return 500;
        }
    }
});

redisClient.on('connect', () => {
    console.log('Redis connecting...');
});

redisClient.on('ready', () => {
    console.log('Redis connected successfully');
});

redisClient.on('reconnecting', () => {
    console.log('Redis reconnecting...');
});

redisClient.on('error', (err) => {
    console.error('Redis error:', err.message);
});

redisClient.on('end', () => {
    console.log('Redis connection closed');
});

const connectRedis = async () => {
    if (!redisClient.isOpen) {
        await redisClient.connect();
    }
};

module.exports = { redisClient, connectRedis };
