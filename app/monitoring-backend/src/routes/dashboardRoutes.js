const express = require("express");
const {
    getDashboardStats
} = require("../controllers/DashboardController");

const router = express.Router();

router.get("/stats", getDashboardStats);

module.exports = router;
