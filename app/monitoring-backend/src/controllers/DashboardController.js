const { getDashboardStats } = require("../services/dashboardStats");

exports.getDashboardStats = async (req, res) => {
    const interval = req.query.interval ?? "hour";
    if (typeof interval !== "string" ||
        !["hour", "month", "year"].includes(interval)) {
        return res.status(400).json({
            error: "Invalid interval. Allowed values are hour, month, and year."
        });
    }

    try {
        const stats = await getDashboardStats({ interval });
        return res.status(200).json(stats);
    } catch (error) {
        console.error("Error calculating dashboard stats:", error.message);
        return res.status(500).json({
            error: "Internal server error while calculating dashboard statistics"
        });
    }
};
