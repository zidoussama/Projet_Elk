const LEVEL_ALIASES = new Map([
    ["ERR", "ERROR"],
    ["WARN", "WARNING"],
    ["FATAL", "CRITICAL"],
    ["INFORMATION", "INFO"]
]);

const LEVEL_VARIANTS = new Map([
    ["INFO", ["INFO", "INFORMATION"]],
    ["ERROR", ["ERROR", "ERR"]],
    ["WARNING", ["WARNING", "WARN"]],
    ["CRITICAL", ["CRITICAL", "FATAL"]]
]);

function normalizeLogLevel(level) {
    if (typeof level !== "string") {
        return undefined;
    }

    const normalized = level.trim().toUpperCase();
    if (!normalized) {
        return undefined;
    }

    return LEVEL_ALIASES.get(normalized) || normalized;
}

function getLogLevelVariants(level) {
    const normalized = normalizeLogLevel(level);
    if (!normalized) return [];
    return LEVEL_VARIANTS.get(normalized) || [normalized];
}

function normalizeLogRecord(record) {
    if (!record || typeof record !== "object" || Array.isArray(record)) {
        return record;
    }

    const level = normalizeLogLevel(record.level);
    return level ? { ...record, level } : record;
}

module.exports = {
    getLogLevelVariants,
    normalizeLogLevel,
    normalizeLogRecord
};
