const elasticClient = require("../config/elasticsearch");
const { File } = require("../Models/FilesModels");

const INDEX_PATTERN = "logs-ecom-*";

function formatUtcHour(timestamp) {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString().slice(0, 13) + ":00:00.000Z";
}

function normalizeErrorCount(response) {
    return typeof response?.count === "number" ? response.count : 0;
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
                query: { term: { level: "ERROR" } }
            }),
            elasticClient.count({
                index: INDEX_PATTERN,
                query: { term: { level: "CRITICAL" } }
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
        levelDistribution: levelBuckets.map(bucket => ({
            level: bucket.key,
            count: bucket.doc_count
        }))
    };
}

module.exports = {
    formatUtcHour,
    getDashboardStats
};
