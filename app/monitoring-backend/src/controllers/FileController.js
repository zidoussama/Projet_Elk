const path = require("node:path");
const { File } = require("../Models/FilesModels");
const { reconcileLogstashUploads } = require("../services/fileIngestion");

exports.getFile = async (req, res) => {
    try {
        const fileData = await File.findById(req.params.id);
        if (!fileData) {
            return res.status(404).json({ error: "File not found" });
        }

        const contentTypes = {
            csv: "text/csv",
            json: "application/json",
            txt: "text/plain"
        };

        res.setHeader(
            "Content-Disposition",
            `attachment; filename="${path.basename(fileData.filename)}"`
        );
        res.setHeader("Content-Type", contentTypes[fileData.type]);
        return res.send(fileData.content);
    } catch (error) {
        console.error("Error retrieving file:", error.message);
        return res.status(500).json({
            error: "Internal server error while retrieving the file"
        });
    }
};

exports.getAllFiles = async (req, res) => {
    try {
        try {
            await reconcileLogstashUploads();
        } catch (error) {
            console.warn("Logstash reconciliation unavailable:", error.message);
        }

        const files = await File.find()
            .select("-content")
            .sort({ uploadDate: -1 });

        return res.status(200).json({
            count: files.length,
            files
        });
    } catch (error) {
        console.error("Error listing files:", error.message);
        return res.status(500).json({
            error: "Internal server error while listing files"
        });
    }
};

exports.deleteFile = async (req, res) => {
    try {
        if (!req.params.id.match(/^[a-f\d]{24}$/i)) {
            return res.status(400).json({ error: "Invalid file id" });
        }

        const deletedFile = await File.findByIdAndDelete(req.params.id);
        if (!deletedFile) {
            return res.status(404).json({ error: "File not found" });
        }

        return res.status(200).json({
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
        return res.status(500).json({
            error: "Internal server error while deleting the file"
        });
    }
};
