
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const { connectRedis, redisClient } = require("./config/redis");
const elasticClient = require("./config/elasticsearch");

const app = express();

// ==========================
// Middleware
// ==========================

app.use(express.json());
app.use(cors());

// ==========================
// Routes
// ==========================

app.get("/test", (req, res) => {
  res.json({ message: "Server works" });
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
          () => reject(new Error("Connection timeout")),
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
  const [mongodb, redis, elasticsearch] = await Promise.all([
    // MongoDB
    checkService(async () => {
      if (mongoose.connection.readyState !== 1) {
        throw new Error("MongoDB disconnected");
      }

      await mongoose.connection.db.admin().ping();
    }),

    // Redis
    checkService(async () => {
      if (!redisClient.isReady) {
        throw new Error("Redis disconnected");
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

  const isHealthy = Object.values(services).every(
    status => status === "UP"
  );

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? "OK" : "DEGRADED",
    timestamp: new Date().toISOString(),
    services
  });
});

// ==========================
// MongoDB & Redis Connection
// ==========================

const mongo_url = process.env.MONGO_URI || process.env.MONGO_URL;

mongoose.set("strictQuery", true);

// ==========================
// Server Startup
// ==========================

const port = process.env.PORT || 3000;

async function startServer() {
  if (!mongo_url) {
    console.error("MongoDB connection failed: MONGO_URI is not configured");
  } else {
    try {
    await mongoose.connect(mongo_url);
    console.log("MongoDB connected...");
    } catch (err) {
      console.error("MongoDB connection failed:", err.message);
    }
  }

  try {
    await connectRedis();
    console.log("Redis connected...");
  } catch (err) {
    console.error("Redis connection failed:", err.message);
  }

  app.listen(port, "0.0.0.0", () => {
    console.log(`Server running on port ${port}`);
  });
}

startServer();
