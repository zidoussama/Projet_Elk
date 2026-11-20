const { getDashboardStats } = require("../services/dashboardStats");

exports.getDashboardStats = async (req, res) => {
    try {
        const stats = await getDashboardStats();
        return res.status(200).json(stats);
    } catch (error) {
        console.error("Error calculating dashboard stats:", error.message);
        return res.status(500).json({
            error: "Internal server error while calculating dashboard statistics"
        });
    }
};
