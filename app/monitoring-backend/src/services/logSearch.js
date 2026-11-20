const elasticClient = require("../config/elasticsearch");

const PAGE_SIZE = 50;
const INDEX_PATTERN = "logs-ecom-*";

function buildSearchQuery(params = {}) {
    const filters = [];
    const text = String(params.text || params.q || "").trim();
    const level = String(params.level || "").trim();
    const service = String(params.service || "").trim();
    const from = String(params.from || params.start || "").trim();
    const to = String(params.to || params.end || "").trim();

    if (level) {
        filters.push({ term: { level: level.toUpperCase() } });
    }
    if (service) {
        filters.push({ term: { service } });
    }
    if (from || to) {
        const range = {};
        if (from) range.gte = from;
        if (to) range.lte = to;
        filters.push({ range: { "@timestamp": range } });
    }

    const query = { bool: { filter: filters } };
    if (text) {
        query.bool.must = [{
            multi_match: {
                query: text,
                fields: ["message", "event_type", "service", "level", "event_id"],
                fuzziness: "AUTO"
            }
        }];
    }

    return query;
}

function parsePage(params = {}) {
    const page = Number.parseInt(params.page, 10);
    return {
        page: Number.isInteger(page) && page > 0 ? page : 1,
        size: PAGE_SIZE
    };
}

function buildSort(sort) {
    const normalized = String(sort || "desc").toLowerCase();
    return [{ "@timestamp": normalized === "asc" ? "asc" : "desc" }];
}

async function searchLogs(params = {}) {
    const { page, size } = parsePage(params);
    const response = await elasticClient.search({
        index: INDEX_PATTERN,
        from: (page - 1) * size,
        size,
        query: buildSearchQuery(params),
        sort: buildSort(params.sort)
    });

    const hits = response.hits?.hits || [];
    const totalValue = typeof response.hits?.total === "object"
        ? response.hits.total.value
        : (response.hits?.total || 0);

    return {
        page,
        size,
        total: totalValue,
        results: hits.map(hit => ({
            id: hit._id,
            index: hit._index,
            score: hit._score,
            ...hit._source
        }))
    };
}

async function getAllCsvLogs(params = {}) {
    const response = await elasticClient.search({
        index: INDEX_PATTERN,
        size: 10000,
        query: buildSearchQuery(params),
        sort: buildSort(params.sort)
    });

    return (response.hits?.hits || []).map(hit => hit._source || {});
}

function escapeCsvValue(value) {
    if (value === null || value === undefined) return "";
    const stringValue = typeof value === "object"
        ? JSON.stringify(value)
        : String(value);
    return `"${stringValue.replace(/"/g, '""')}"`;
}

function logsToCsv(logs) {
    if (!Array.isArray(logs) || logs.length === 0) return "";

    const columns = [...new Set(logs.flatMap(log => Object.keys(log)))];
    const header = columns.map(escapeCsvValue).join(",");
    const rows = logs.map(log =>
        columns.map(column => escapeCsvValue(log[column])).join(",")
    );
    return [header, ...rows].join("\n");
}

module.exports = {
    PAGE_SIZE,
    buildSearchQuery,
    parsePage,
    buildSort,
    searchLogs,
    getAllCsvLogs,
    logsToCsv
};
