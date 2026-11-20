const express = require("express");
const mongoose = require("mongoose");
const { File } = require("../Models/FilesModels");
const {
    reconcileUploadedFile,
    reconcileLogstashUploads
} = require("../services/fileIngestion");

const router = express.Router();

router.get("/:id/status", async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ error: "Invalid file id" });
        }

        await reconcileUploadedFile(req.params.id);
        const file = await File.findById(req.params.id).select("-content");
        if (!file) {
            return res.status(404).json({ error: "File not found" });
        }
        return res.status(200).json(file);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

router.get("/stream", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const sendStatus = async () => {
        try {
            await reconcileLogstashUploads();
            const files = await File.find()
                .select("-content")
                .sort({ uploadDate: -1 });
            res.write(`data: ${JSON.stringify({ count: files.length, files })}\n\n`);
        } catch (error) {
            res.write(`event: error\ndata: ${JSON.stringify({ error: error.message })}\n\n`);
        }
    };

    sendStatus();
    const interval = setInterval(sendStatus, 3000);
    req.on("close", () => clearInterval(interval));
});

module.exports = router;
