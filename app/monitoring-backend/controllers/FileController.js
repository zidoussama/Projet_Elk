const path = require("node:path");
const { File } = require("../Models/FilesModels");

const SUPPORTED_TYPES = new Set(["csv", "json", "txt"]);
const DEFAULT_MAX_FILE_SIZE_MB = 100;

function getMaxFileSizeBytes() {
    const sizeInMb = Number(
        process.env.MAX_LOG_FILE_SIZE_MB || DEFAULT_MAX_FILE_SIZE_MB
    );

    if (!Number.isFinite(sizeInMb) || sizeInMb <= 0) {
        throw new Error("MAX_LOG_FILE_SIZE_MB must be a positive number");
    }

    return sizeInMb * 1024 * 1024;
}

function parseCsv(content) {
    const rows = [];
    let row = [];
    let field = "";
    let quoted = false;

    for (let index = 0; index < content.length; index += 1) {
        const character = content[index];

        if (quoted) {
            if (character === '"' && content[index + 1] === '"') {
                field += '"';
                index += 1;
            } else if (character === '"') {
                quoted = false;
            } else {
                field += character;
            }
        } else if (character === '"') {
            quoted = true;
        } else if (character === ",") {
            row.push(field);
            field = "";
        } else if (character === "\n") {
            row.push(field);
            if (row.some(value => value.trim() !== "")) {
                rows.push(row);
            }
            row = [];
            field = "";
        } else if (character !== "\r") {
            field += character;
        }
    }

    if (quoted) {
        throw new Error("Invalid CSV syntax: a quoted field is not closed");
    }

    row.push(field);
    if (row.some(value => value.trim() !== "")) {
        rows.push(row);
    }

    return rows;
}

function validateUploadedFile(file) {
    if (!file || !file.originalname || !Buffer.isBuffer(file.buffer)) {
        throw new Error("A file is required in the multipart field named 'file'");
    }

    const extension = path.extname(file.originalname).toLowerCase().slice(1);
    if (!SUPPORTED_TYPES.has(extension)) {
        throw new Error(
            "Unsupported file type. Accepted extensions are .csv, .json, and .txt"
        );
    }

    if (file.buffer.length > getMaxFileSizeBytes()) {
        throw new Error(
            `File is too large. Maximum allowed size is ${process.env.MAX_LOG_FILE_SIZE_MB || DEFAULT_MAX_FILE_SIZE_MB} MB`
        );
    }

    const content = file.buffer.toString("utf8");
    if (extension === "json") {
        try {
            JSON.parse(content);
        } catch {
            throw new Error(
                "Invalid JSON file: the file does not contain valid JSON syntax"
            );
        }
    }

    if (extension === "csv") {
        const rows = parseCsv(content);
        if (rows.length === 0 || rows[0].every(value => value.trim() === "")) {
            throw new Error("Invalid CSV file: a non-empty header row is required");
        }

        const columnCount = rows[0].length;
        const invalidRow = rows.findIndex(row => row.length !== columnCount);
        if (invalidRow !== -1) {
            throw new Error(
                `Invalid CSV file: row ${invalidRow + 1} has ${rows[invalidRow].length} columns; expected ${columnCount}`
            );
        }
    }

    return {
        filename: path.basename(file.originalname),
        type: extension,
        size: file.buffer.length,
        content: file.buffer
    };
}

exports.uploadFile = async (req, res) => {
    try {
        const fileData = validateUploadedFile(req.file);
        const newFile = new File({
            ...fileData,
            status: "validated"
        });
        await newFile.save();

        res.status(201).json({
            message: "File uploaded and validated successfully",
            file: {
                id: newFile._id,
                filename: newFile.filename,
                type: newFile.type,
                size: newFile.size,
                status: newFile.status,
                uploadDate: newFile.uploadDate
            }
        });
    } catch (error) {
        const statusCode = error.name === "ValidationError" ||
            error.message.startsWith("Invalid") ||
            error.message.startsWith("Unsupported") ||
            error.message.startsWith("A file") ||
            error.message.startsWith("File is too large")
            ? 400
            : 500;

        console.error("Error uploading file:", error.message);
        res.status(statusCode).json({
            error: statusCode === 500
                ? "Internal server error while saving the file"
                : error.message
        });
    }
};

exports.getFile = async (req, res) => {
    try {
        const fileId = req.params.id;
        const fileData = await File.findById(fileId);
        if (!fileData) {
            return res.status(404).json({ error: "File not found" });
        }

        const contentTypes = {
            csv: "text/csv",
            json: "application/json",
            txt: "text/plain"
        };

        res.setHeader("Content-Disposition", `attachment; filename="${fileData.filename}"`);
        res.setHeader("Content-Type", contentTypes[fileData.type]);
        res.send(fileData.content);
    } catch (error) {
        console.error("Error retrieving file:", error.message);
        res.status(500).json({ error: "Internal server error while retrieving the file" });
    }
};

exports.getAllFiles = async (req, res) => {
    try {
        const files = await File.find()
            .select("-content")
            .sort({ uploadDate: -1 });

        res.status(200).json({
            count: files.length,
            files
        });
    } catch (error) {
        console.error("Error listing files:", error.message);
        res.status(500).json({
            error: "Internal server error while listing files"
        });
    }
};

exports.deleteFile = async (req, res) => {
    try {
        const fileId = req.params.id;

        if (!fileId.match(/^[a-f\d]{24}$/i)) {
            return res.status(400).json({
                error: "Invalid file id"
            });
        }

        const deletedFile = await File.findByIdAndDelete(fileId);
        if (!deletedFile) {
            return res.status(404).json({
                error: "File not found"
            });
        }

        res.status(200).json({
            message: "File deleted successfully",
            file: {
                id: deletedFile._id,
                filename: deletedFile.filename,
                type: deletedFile.type,
                status: deletedFile.status,
                uploadDate: deletedFile.uploadDate
            }
        });
    } catch (error) {
        console.error("Error deleting file:", error.message);
        res.status(500).json({
            error: "Internal server error while deleting the file"
        });
    }
};

exports.validateUploadedFile = validateUploadedFile;
exports.getMaxFileSizeBytes = getMaxFileSizeBytes;