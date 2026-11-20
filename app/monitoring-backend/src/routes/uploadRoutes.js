const express = require("express");
const multer = require("multer");
const { uploadFile } = require("../controllers/FileUploadController");
const { previewFile } = require("../controllers/FilePreviewController");
const {
    validateLogFile,
    getMaxFileSizeBytes
} = require("../middleware/validateLogFile");

const router = express.Router();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: getMaxFileSizeBytes() }
});

router.post("/preview", upload.single("file"), validateLogFile, previewFile);
router.post("/upload", upload.single("file"), validateLogFile, uploadFile);

router.use((error, req, res, _next) => {
    if (error instanceof multer.MulterError &&
        error.code === "LIMIT_FILE_SIZE") {
        const maxMb = getMaxFileSizeBytes() / (1024 * 1024);
        return res.status(400).json({
            error: `File is too large. Maximum allowed size is ${maxMb} MB`
        });
    }
    return res.status(500).json({
        error: "Unexpected error while processing the file"
    });
});

module.exports = router;
