
const path = require("node:path");
const mongoose = require("mongoose");
const { File } = require("../Models/FilesModels");
const { processUploadedFile } = require("../services/fileIngestion");

exports.uploadFile = async (req, res) => {
    try {
        console.log("[UPLOAD] Step 1: Checking uploaded file");

        const file = req.file;

        if (!file || !Buffer.isBuffer(file.buffer)) {
            throw new Error("Uploaded file or buffer is missing");
        }

        console.log("[UPLOAD] File:", file.originalname);
        console.log("[UPLOAD] Buffer size:", file.buffer.length);

        const type = path.extname(file.originalname)
            .toLowerCase()
            .slice(1);

        console.log("[UPLOAD] Step 2: Creating MongoDB document");

        const newFile = new File({
            filename: path.basename(file.originalname),
            type,
            size: file.buffer.length,
            content: file.buffer,
            status: "validated",
            uploadId: `u_${new Date().toISOString().slice(0, 10).replace(/-/g, "")}_${new mongoose.Types.ObjectId().toString().slice(-8)}`,
            sourceFormat: type,
            ingestionType: "logstash"
        });

        console.log("[UPLOAD] Step 3: Saving to MongoDB");

        await newFile.save();

        console.log("[UPLOAD] MongoDB save successful:", newFile._id);

        console.log("[UPLOAD] Step 4: Starting ingestion");

        const ingestedFile = await processUploadedFile(newFile._id);

        console.log("[UPLOAD] Ingestion result:", ingestedFile.status);

        return res.status(201).json({
            message: ingestedFile.status === "indexed"
                ? "File uploaded and indexed successfully"
                : ingestedFile.status === "ingesting"
                    ? "File uploaded and Logstash ingestion started"
                    : "File uploaded but indexing failed",
            file: ingestedFile
        });

    } catch (error) {
        console.error("\n========== UPLOAD ERROR ==========");
        console.error(error.stack || error);
        console.error("==================================\n");

        return res.status(500).json({
            error: "Internal server error while saving the file",
            details: error.message
        });
    }
};
