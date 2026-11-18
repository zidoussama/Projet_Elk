
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const { connectMongoDB } = require("./config/mongodb");
const { connectRedis, redisClient } = require("./config/redis");
const elasticClient = require("./config/elasticsearch");

const app = express();

// ==========================
// Existing configurations
// ==========================

// ==========================
// Middleware
// ==========================

app.use(cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true
}));

// ==========================
// Server startup
// ==========================

const PORT = process.env.PORT || 3000;

async function startServer() {

    try {

        // 1. Connect MongoDB
        await connectMongoDB();

        console.log("MongoDB connected successfully");

        // 2. Initialize Better Auth using existing Mongoose connection
        const { toNodeHandler } = await import("better-auth/node");
        const { createAuth } = await import("../Auth/auth.js");
        const auth = createAuth(mongoose.connection.db);

        // 3. Mount Better Auth BEFORE express.json()
        app.all(
            "/api/auth/*splat",
            toNodeHandler(auth)
        );

        console.log("Better Auth initialized");

        // 4. Existing Redis connection
        try {
            await connectRedis();
            console.log("Redis connected successfully");
        } catch (error) {
            console.error("Redis connection failed:", error.message);
        }

        // 5. Existing Express middleware
        app.use(express.json());

        // ==========================
        // Existing routes
        // ==========================

        app.get("/test", (req, res) => {
            res.json({
                message: "Server works"
            });
        });

        // ==========================
        // Health Check
        // ==========================

        async function checkService(checkFunction) {
            let timeout;

            try {
                await Promise.race([
                    checkFunction(),
                    new Promise((_, reject) => {
                        timeout = setTimeout(
                            () => reject(new Error("Timeout")),
                            3000
                        );
                    })
                ]);

                return "UP";

            } catch {
                return "DOWN";

            } finally {
                clearTimeout(timeout);
            }
        }

        app.get("/health", async (req, res) => {

            const [mongodb, redis, elasticsearch] =
                await Promise.all([

                    checkService(async () => {
                        if (mongoose.connection.readyState !== 1) {
                            throw new Error("MongoDB disconnected");
                        }

                        await mongoose.connection.db.admin().ping();
                    }),

                    checkService(async () => {
                        if (!redisClient.isReady) {
                            throw new Error("Redis disconnected");
                        }

                        await redisClient.ping();
                    }),

                    checkService(async () => {
                        await elasticClient.info();
                    })

                ]);

            const services = {
                mongodb,
                redis,
                elasticsearch
            };

            const healthy = Object.values(services)
                .every(status => status === "UP");

            res.status(healthy ? 200 : 503).json({
                status: healthy ? "OK" : "DEGRADED",
                timestamp: new Date().toISOString(),
                services
            });
        });

        // ==========================
        // Start Express
        // ==========================

        app.listen(PORT, "0.0.0.0", () => {
            console.log(`Server running on port ${PORT}`);
            console.log(`Health: http://localhost:${PORT}/health`);
            console.log(`Auth: http://localhost:${PORT}/api/auth`);
        });

    } catch (error) {

        console.error("Application startup failed:", error);

        process.exit(1);
    }
}

startServer();
