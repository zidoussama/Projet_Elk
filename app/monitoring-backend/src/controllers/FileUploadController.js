const path = require("node:path");
const mongoose = require("mongoose");
const { File } = require("../Models/FilesModels");
const { processUploadedFile } = require("../services/fileIngestion");

exports.uploadFile = async (req, res) => {
    try {
        const file = req.file;
        const type = path.extname(file.originalname).toLowerCase().slice(1);
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
        await newFile.save();
        const ingestedFile = await processUploadedFile(newFile._id);

        return res.status(201).json({
            message: ingestedFile.status === "indexed"
                ? "File uploaded and indexed successfully"
                : ingestedFile.status === "ingesting"
                    ? "File uploaded and Logstash ingestion started"
                    : "File uploaded but indexing failed",
            file: ingestedFile
        });
    } catch (error) {
        console.error("Error uploading file:", error.message);
        return res.status(500).json({
            error: "Internal server error while saving the file"
        });
    }
};
