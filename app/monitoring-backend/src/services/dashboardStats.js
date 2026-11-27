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

function formatUtcBucket(timestamp) {
    const date = new Date(timestamp);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
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

function buildEvolutionAggregation(interval = "hour", now = new Date()) {
    const nowIso = now.toISOString();
    const dateHistogram = {
        field: "@timestamp",
        format: "yyyy-MM-dd'T'HH:mm:ss.SSSXXX",
        min_doc_count: 0,
        keyed: false
    };
    let filter = { match_all: {} };

    if (interval === "hour") {
        const from = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
        filter = {
            range: {
                "@timestamp": {
                    gte: from,
                    lte: nowIso
                }
            }
        };
        dateHistogram.fixed_interval = "1h";
        dateHistogram.extended_bounds = { min: from, max: nowIso };
    } else if (interval === "month") {
        const start = new Date(Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth() - 11,
            1
        )).toISOString();
        filter = {
            range: {
                "@timestamp": {
                    gte: start,
                    lte: nowIso
                }
            }
        };
        dateHistogram.calendar_interval = "month";
        dateHistogram.extended_bounds = { min: start, max: nowIso };
    } else if (interval === "year") {
        dateHistogram.calendar_interval = "year";
    } else {
        throw new Error("interval must be one of: hour, month, year");
    }

    return { filter, dateHistogram };
}

async function getDashboardStats({ interval = "hour" } = {}, now = new Date()) {
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
    const evolution = buildEvolutionAggregation(interval, now);

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
                    evolution: {
                        global: {},
                        aggs: {
                            filtered: {
                                filter: evolution.filter,
                                aggs: {
                                    buckets: {
                                        date_histogram: evolution.dateHistogram
                                    }
                                }
                            }
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

    const evolutionBuckets =
        aggregateResponse.aggregations?.evolution?.filtered?.buckets?.buckets || [];
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
        hourlyEvolution: evolutionBuckets.map(bucket => ({
            hour: formatUtcBucket(bucket.key_as_string || bucket.key),
            count: bucket.doc_count
        })),
        levelDistribution: normalizeLevelBuckets(levelBuckets)
    };
}

module.exports = {
    buildLevelCountQuery,
    buildEvolutionAggregation,
    formatUtcBucket,
    formatUtcHour,
    getDashboardStats,
    normalizeLevelBuckets
};
