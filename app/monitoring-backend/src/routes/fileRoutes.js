const express = require("express");
const {
    getFile,
    getAllFiles,
    deleteFile
} = require("../controllers/FileController");

const router = express.Router();

router.get("/", getAllFiles);
router.get("/:id/download", getFile);
router.delete("/:id", deleteFile);

module.exports = router;
