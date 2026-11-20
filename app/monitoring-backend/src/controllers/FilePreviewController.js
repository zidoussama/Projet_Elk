const path = require("node:path");

function buildFilePreview(file) {
    const content = file.buffer.toString("utf8");
    const type = path.extname(file.originalname).toLowerCase().slice(1);
    const lines = type === "json"
        ? (Array.isArray(JSON.parse(content))
            ? JSON.parse(content).map(record => JSON.stringify(record))
            : [JSON.stringify(JSON.parse(content))])
        : content.split(/\r?\n/).filter(line => line.trim() !== "");

    return {
        filename: path.basename(file.originalname),
        type,
        size: file.buffer.length,
        lineCount: lines.length,
        preview: lines.slice(0, 10),
        validation: {
            valid: true,
            message: "File validation succeeded"
        }
    };
}

exports.previewFile = async (req, res) => {
    try {
        return res.status(200).json(buildFilePreview(req.file));
    } catch (error) {
        return res.status(400).json({
            error: error.message,
            validation: {
                valid: false,
                message: error.message
            }
        });
    }
};

exports.buildFilePreview = buildFilePreview;
