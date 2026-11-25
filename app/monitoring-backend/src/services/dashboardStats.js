const elasticClient = require("../config/elasticsearch");
const { File } = require("../Models/FilesModels");
const {
    getLogLevelVariants,
    normalizeLogLevel
} = require("../utils/logLevel");

const INDEX_PATTERN = "logs-ecom-*";

function formatUtcHour(timestamp) {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString().slice(0, 13) + ":00:00.000Z";
}

function normalizeErrorCount(response) {
    return typeof response?.count === "number" ? response.count : 0;
}

function buildLevelCountQuery(levels) {
    const variants = [...new Set(
        levels.flatMap(level => getLogLevelVariants(level))
    )];

    return {
        bool: {
            should: variants.map(variant => ({
                term: { level: { value: variant, case_insensitive: true } }
            })),
            minimum_should_match: 1
        }
    };
}

function normalizeLevelBuckets(buckets = []) {
    const counts = new Map();

    for (const bucket of buckets) {
        const level = normalizeLogLevel(bucket.key);
        if (!level) continue;
        counts.set(level, (counts.get(level) || 0) + bucket.doc_count);
    }

    return Array.from(counts, ([level, count]) => ({ level, count }))
        .sort((left, right) => right.count - left.count);
}

async function getDashboardStats(now = new Date()) {
    const startOfDay = new Date(now);
    startOfDay.setUTCHours(0, 0, 0, 0);

    const endOfDay = new Date(startOfDay);
    endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);
    const twentyFourHoursAgo = new Date(now);
    twentyFourHoursAgo.setUTCHours(
        twentyFourHoursAgo.getUTCHours() - 24,
        twentyFourHoursAgo.getUTCMinutes(),
        twentyFourHoursAgo.getUTCSeconds(),
        0
    );

    const [totalResponse, todayResponse, errorResponse, criticalResponse, aggregateResponse, importedFiles] =
        await Promise.all([
            elasticClient.count({ index: INDEX_PATTERN }),
            elasticClient.count({
                index: INDEX_PATTERN,
                query: {
                    range: {
                        "@timestamp": {
                            gte: startOfDay.toISOString(),
                            lt: endOfDay.toISOString()
                        }
                    }
                }
            }),
            elasticClient.count({
                index: INDEX_PATTERN,
                query: buildLevelCountQuery(["ERROR", "ERR"])
            }),
            elasticClient.count({
                index: INDEX_PATTERN,
                query: buildLevelCountQuery(["CRITICAL", "FATAL"])
            }),
            elasticClient.search({
                index: INDEX_PATTERN,
                size: 0,
                query: {
                    range: {
                        "@timestamp": {
                            gte: twentyFourHoursAgo.toISOString(),
                            lte: now.toISOString()
                        }
                    }
                },
                aggs: {
                    hourly: {
                        date_histogram: {
                            field: "@timestamp",
                            fixed_interval: "1h",
                            format: "yyyy-MM-dd'T'HH:mm:ss.SSSXXX",
                            min_doc_count: 0,
                            keyed: false
                        }
                    },
                    levels: {
                        terms: {
                            field: "level",
                            size: 20,
                            order: { _count: "desc" }
                        }
                    }
                }
            }),
            File.countDocuments({})
        ]);

    const hourlyBuckets = aggregateResponse.aggregations?.hourly?.buckets || [];
    const levelBuckets = aggregateResponse.aggregations?.levels?.buckets || [];

    return {
        totalLogs: normalizeErrorCount(totalResponse),
        logsToday: normalizeErrorCount(todayResponse),
        errorLogs: normalizeErrorCount(errorResponse),
        criticalLogs: normalizeErrorCount(criticalResponse),
        errorCriticalLogs:
            normalizeErrorCount(errorResponse) +
            normalizeErrorCount(criticalResponse),
        importedFiles,
        hourlyEvolution: hourlyBuckets.map(bucket => ({
            hour: formatUtcHour(bucket.key_as_string || bucket.key),
            count: bucket.doc_count
        })),
        levelDistribution: normalizeLevelBuckets(levelBuckets)
    };
}

module.exports = {
    buildLevelCountQuery,
    formatUtcHour,
    getDashboardStats,
    normalizeLevelBuckets
};
