const express = require("express");
const multer = require("multer");
const mongoose = require("mongoose");
const {
    uploadFile,
    getFile,
    getAllFiles,
    deleteFile,
    getMaxFileSizeBytes
} = require("../controllers/FileController");
const { validateLogFile } = require("../middleware/validateLogFile");

const router = express.Router();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: getMaxFileSizeBytes()
    }
});

router.post("/upload", upload.single("file"), validateLogFile, uploadFile);
router.get("/", getAllFiles);
router.get("/stream", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const sendStatus = async () => {
        try {
            const { reconcileLogstashUploads } =
                require("../services/fileIngestion");
            await reconcileLogstashUploads();
            const { File } = require("../Models/FilesModels");
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
router.get("/:id/status", async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ error: "Invalid file id" });
        }
        const { File } = require("../Models/FilesModels");
        const { reconcileUploadedFile } =
            require("../services/fileIngestion");
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
router.get("/:id/download", getFile);
router.delete("/:id", deleteFile);

router.use((error, req, res, _next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === "LIMIT_FILE_SIZE") {
            const maxMb = getMaxFileSizeBytes() / (1024 * 1024);
            return res.status(400).json({
                error: `File is too large. Maximum allowed size is ${maxMb} MB`
            });
        }

        return res.status(400).json({
            error: `File upload failed: ${error.message}`
        });
    }

    return res.status(500).json({
        error: "Unexpected error while processing the file"
    });
});

module.exports = router;
