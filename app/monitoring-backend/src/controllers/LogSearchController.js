const {
    searchLogs,
    getAllCsvLogs,
    logsToCsv
} = require("../services/logSearch");

exports.searchLogs = async (req, res) => {
    try {
        return res.status(200).json(await searchLogs(req.query));
    } catch (error) {
        console.error("Error searching logs:", error.message);
        return res.status(500).json({
            error: "Internal server error while searching logs"
        });
    }
};

exports.exportLogsCsv = async (req, res) => {
    try {
        const logs = await getAllCsvLogs(req.query);
        const csv = logsToCsv(logs);
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader(
            "Content-Disposition",
            'attachment; filename="logs-export.csv"'
        );
        return res.status(200).send(csv);
    } catch (error) {
        console.error("Error exporting logs:", error.message);
        return res.status(500).json({
            error: "Internal server error while exporting logs"
        });
    }
};
