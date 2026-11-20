const mongoose = require('mongoose');

const connectMongoDB = async () => {
    const mongoUrl = process.env.MONGO_URI || process.env.MONGO_URL;

    if (!mongoUrl) {
        throw new Error("MongoDB connection failed: MONGO_URI or MONGO_URL is not configured");
    }

    await mongoose.connect(mongoUrl);
    console.log('MongoDB connected');
};

module.exports = { mongoose, connectMongoDB };