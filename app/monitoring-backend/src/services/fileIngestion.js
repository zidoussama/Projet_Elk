const elasticClient = require("../config/elasticsearch");
const { File } = require("../Models/FilesModels");
const fs = require("node:fs/promises");
const path = require("node:path");
const { normalizeLogRecord } = require("../utils/logLevel");

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

    row.push(field);
    if (row.some(value => value.trim() !== "")) {
        rows.push(row);
    }

    return rows;
}

function buildDocuments(file) {
    const content = file.content.toString("utf8");
    const uploadId = file.uploadId || `u_${file._id.toString()}`;
    const common = {
        upload_id: uploadId,
        source_file: file.filename,
        source_format: file.type
    };

    if (file.type === "json") {
        const parsed = JSON.parse(content);
        const records = Array.isArray(parsed) ? parsed : [parsed];
        return records.map(record => ({
            ...common,
            ...normalizeLogRecord(record),
            "@timestamp": record["@timestamp"] || record.timestamp || new Date().toISOString()
        }));
    }

    if (file.type === "csv") {
        const rows = parseCsvRows(content);
        if (rows.length < 2) {
            return [];
        }

        const headers = rows[0].map(header => header.trim());
        return rows.slice(1).map((row, index) => {
            const record = {};
            headers.forEach((header, columnIndex) => {
                record[header] = row[columnIndex] || "";
            });

            return {
                ...common,
                ...normalizeLogRecord(record),
                event_id: record.event_id || `${file._id.toString()}-${index + 1}`,
                "@timestamp": record.timestamp || record["@timestamp"] || new Date().toISOString()
            };
        });
    }

    return content
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean)
        .map((message, index) => ({
            ...common,
            event_id: `${file._id.toString()}-${index + 1}`,
            level: "INFO",
            message,
            "@timestamp": new Date().toISOString()
        }));
}

async function processUploadedFile(fileId) {
    const file = await File.findById(fileId);
    if (!file) {
        throw new Error("Uploaded file record not found");
    }

    file.status = "ingesting";
    file.uploadId = file.uploadId || `u_${file._id.toString()}`;
    file.sourceFormat = file.type;
    file.ingestionType = "logstash";
    file.indexingError = undefined;
    await file.save();

    try {
        await writeLogstashUpload(file);
        return file;
    } catch (error) {
        file.status = "failed";
        file.indexedCount = 0;
        file.logCount = 0;
        file.indexingError = error.message;
        await file.save();

        return file;
    }
}

async function writeLogstashUpload(file) {
    const watchDir = process.env.LOGSTASH_WATCH_DIR ||
        path.resolve(__dirname, "../../../../docker/elk/logs");
    await fs.mkdir(watchDir, { recursive: true });

    const filename = path.basename(file.filename);
    const finalName = `${file.uploadId}_${filename}`;
    const finalPath = path.join(watchDir, finalName);
    const tempPath = path.join(
        watchDir,
        `.${finalName}.${process.pid}.${Date.now()}.tmp`
    );

    let content = file.content;
    if (file.type === "json") {
        const parsed = JSON.parse(content.toString("utf8"));
        if (Array.isArray(parsed)) {
            content = Buffer.from(
                parsed.map(record => JSON.stringify(record)).join("\n") + "\n",
                "utf8"
            );
        }
    }

    await fs.writeFile(tempPath, content);
    await fs.rename(tempPath, finalPath);
}

async function reconcileUploadedFile(fileId) {
    const file = await File.findById(fileId);
    if (!file) {
        throw new Error("Uploaded file record not found");
    }

    if (!file.uploadId) {
        return file;
    }

    const countResponse = await elasticClient.count({
        index: "logs-ecom-*",
        query: {
            term: { upload_id: file.uploadId }
        }
    });

    if (countResponse.count > 0) {
        file.status = "indexed";
        file.indexedCount = countResponse.count;
        file.logCount = countResponse.count;
        file.indexedAt = file.indexedAt || new Date();
        file.indexingError = undefined;
    } else if (file.status === "ingesting") {
        file.status = "ingesting";
    }

    await file.save();
    return file;
}

async function reconcileLogstashUploads() {
    const response = await elasticClient.search({
        index: "logs-ecom-*",
        size: 0,
        query: {
            bool: {
                filter: [
                    { exists: { field: "source_file" } },
                    { exists: { field: "upload_id" } }
                ]
            }
        },
        aggs: {
            uploads: {
                terms: { field: "upload_id", size: 1000 },
                aggs: {
                    files: {
                        terms: { field: "source_file", size: 10 }
                    },
                    formats: {
                        terms: {
                            field: "source_format",
                            size: 10
                        }
                    }
                }
            }
        }
    });

    const buckets = response.aggregations?.uploads?.buckets ||
        response.aggregations?.files?.buckets || [];
    for (const bucket of buckets) {
        let uploadId = bucket.key;
        let sourceFile = bucket.files?.buckets?.[0]?.key;
        if (!sourceFile && typeof bucket.key === "string") {
            sourceFile = bucket.key;
        }

        if (!uploadId || typeof uploadId !== "string") {
            continue;
        }

        const filenameFromSource = sourceFile
            ? sourceFile.split(/[\\/]/).pop()
            : "";
        if (typeof bucket.key === "string" &&
            bucket.key.includes("/") &&
            !filenameFromSource) {
            continue;
        }

        const match = filenameFromSource.match(/^(u_[^_]+_[^_]+)_(.+)$/);
        if (typeof uploadId === "string" &&
            uploadId.includes("/") &&
            match) {
            uploadId = match[1];
        } else if (!match && filenameFromSource) {
            const legacyMatch = filenameFromSource.match(/^(u_[^_]+_[^_]+)_/);
            if (legacyMatch) {
                uploadId = legacyMatch[1];
            }
        }

        const filename = filenameFromSource
            ? filenameFromSource.replace(/^u_[^_]+_[^_]+_/, "")
            : "";
        if (!filename || !uploadId.startsWith("u_")) {
            continue;
        }

        const formatBucket = bucket.formats?.buckets?.[0];
        const sourceFormat = formatBucket?.key;
        const extension = path.extname(filename).slice(1).toLowerCase();
        const resolvedFormat = ["csv", "json", "txt"].includes(sourceFormat)
            ? sourceFormat
            : (extension === "jsonl" ? "json" : extension);

        if (!["csv", "json", "txt"].includes(resolvedFormat)) {
            continue;
        }

        await File.findOneAndUpdate(
            { uploadId },
            {
                $set: {
                    filename,
                    type: resolvedFormat,
                    sourceFormat: resolvedFormat,
                    size: 0,
                    status: "indexed",
                    logCount: bucket.doc_count,
                    indexedCount: bucket.doc_count,
                    indexedAt: new Date(),
                    ingestionType: "logstash",
                    uploadId,
                    indexingError: undefined
                },
                $setOnInsert: {
                    uploadDate: new Date()
                }
            },
            {
                upsert: true,
                runValidators: true,
                setDefaultsOnInsert: true
            }
        );
    }
}

module.exports = {
    buildDocuments,
    parseCsvRows,
    processUploadedFile,
    reconcileUploadedFile,
    reconcileLogstashUploads,
    writeLogstashUpload
};
