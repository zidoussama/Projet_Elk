const path = require("node:path");

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

function parseCsvRows(content) {
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

function validateLogFile(req, res, next) {
    try {
        const file = req.file;

        if (!file || !file.originalname || !Buffer.isBuffer(file.buffer)) {
            return res.status(400).json({
                error: "A file is required in the multipart field named 'file'"
            });
        }

        const type = path.extname(file.originalname).toLowerCase().slice(1);
        if (!SUPPORTED_TYPES.has(type)) {
            return res.status(400).json({
                error: "Unsupported file type. Accepted extensions are .csv, .json, and .txt"
            });
        }

        if (file.buffer.length > getMaxFileSizeBytes()) {
            return res.status(400).json({
                error: `File is too large. Maximum allowed size is ${process.env.MAX_LOG_FILE_SIZE_MB || DEFAULT_MAX_FILE_SIZE_MB} MB`
            });
        }

        if (file.buffer.length === 0) {
            return res.status(400).json({
                error: "The uploaded file is empty"
            });
        }

        const content = file.buffer.toString("utf8");

        if (type === "json") {
            try {
                JSON.parse(content);
            } catch {
                return res.status(400).json({
                    error: "Invalid JSON file: the file does not contain valid JSON syntax"
                });
            }
        }

        if (type === "csv") {
            const rows = parseCsvRows(content);
            if (rows.length === 0 || rows[0].every(value => value.trim() === "")) {
                return res.status(400).json({
                    error: "Invalid CSV file: a non-empty header row is required"
                });
            }

            const columnCount = rows[0].length;
            const invalidRow = rows.findIndex(row => row.length !== columnCount);
            if (invalidRow !== -1) {
                return res.status(400).json({
                    error: `Invalid CSV file: row ${invalidRow + 1} has ${rows[invalidRow].length} columns; expected ${columnCount}`
                });
            }
        }

        return next();
    } catch (error) {
        return res.status(400).json({
            error: error.message
        });
    }
}

module.exports = {
    validateLogFile,
    getMaxFileSizeBytes,
    parseCsvRows
};
