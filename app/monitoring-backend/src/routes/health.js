const express = require('express');
const router = express.Router();

const { mongoose } = require('../config/mongodb');
const { redisClient } = require('../config/redis');
const elasticClient = require('../config/elasticsearch');

// Vérifier un service avec un timeout
async function checkService(checkFunction) {
    let timeout;

    try {
        await Promise.race([
            checkFunction(),
            new Promise((_, reject) =>
                timeout = setTimeout(() => reject(new Error('Timeout')), 3000)
            )
        ]);

        return 'UP';

    } catch {
        return 'DOWN';
    } finally {
        clearTimeout(timeout);
    }
}

// GET /health
router.get('/', async (req, res) => {

    const [mongodb, redis, elasticsearch] = await Promise.all([

        // MongoDB
        checkService(async () => {
            if (mongoose.connection.readyState !== 1) {
                throw new Error('MongoDB disconnected');
            }

            await mongoose.connection.db.admin().ping();
        }),

        // Redis
        checkService(async () => {
            if (!redisClient.isReady) {
                throw new Error('Redis disconnected');
            }

            await redisClient.ping();
        }),

        // Elasticsearch
        checkService(async () => {
            await elasticClient.info();
        })

    ]);

    const services = {
        mongodb,
        redis,
        elasticsearch
    };

    const allHealthy = Object.values(services)
        .every(status => status === 'UP');

    const response = {
        status: allHealthy ? 'OK' : 'DEGRADED',
        timestamp: new Date().toISOString(),
        services
    };

    return res.status(allHealthy ? 200 : 503).json(response);
});

module.exports = router;