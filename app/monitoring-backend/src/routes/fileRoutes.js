const express = require("express");
const multer = require("multer");
const {
    uploadFile,
    getFile,
    getAllFiles,
    deleteFile,
    getMaxFileSizeBytes
} = require("../../controllers/FileController");
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