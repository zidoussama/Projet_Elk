const express = require("express");
const {
    searchLogs,
    exportLogsCsv
} = require("../controllers/LogSearchController");

const router = express.Router();

router.get("/search/export", exportLogsCsv);
router.get("/search", searchLogs);

module.exports = router;
