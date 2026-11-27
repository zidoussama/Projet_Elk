const {
    buildEvolutionAggregation,
    buildLevelCountQuery,
    formatUtcHour,
    normalizeLevelBuckets
} = require("./dashboardStats");

describe("dashboard statistics helpers", () => {
    it("formats an hourly bucket as an ISO UTC hour", () => {
        expect(formatUtcHour("2026-11-20T11:30:00.000Z"))
            .toBe("2026-11-20T11:00:00.000Z");
    });

    it("returns null for an invalid hourly bucket", () => {
        expect(formatUtcHour("invalid")).toBeNull();
    });

    it("uses a rolling 24-hour window for hourly evolution by default", () => {
        expect(buildEvolutionAggregation(
            "hour",
            new Date("2026-11-27T12:00:00.000Z")
        )).toEqual({
            filter: {
                range: {
                    "@timestamp": {
                        gte: "2026-11-26T12:00:00.000Z",
                        lte: "2026-11-27T12:00:00.000Z"
                    }
                }
            },
            dateHistogram: {
                field: "@timestamp",
                format: "yyyy-MM-dd'T'HH:mm:ss.SSSXXX",
                min_doc_count: 0,
                keyed: false,
                fixed_interval: "1h",
                extended_bounds: {
                    min: "2026-11-26T12:00:00.000Z",
                    max: "2026-11-27T12:00:00.000Z"
                }
            }
        });
    });

    it("uses the current and previous 11 calendar months for monthly evolution", () => {
        const { filter, dateHistogram } = buildEvolutionAggregation(
            "month",
            new Date("2026-11-27T12:00:00.000Z")
        );

        expect(filter.range["@timestamp"]).toEqual({
            gte: "2025-12-01T00:00:00.000Z",
            lte: "2026-11-27T12:00:00.000Z"
        });
        expect(dateHistogram.calendar_interval).toBe("month");
        expect(dateHistogram.extended_bounds).toEqual({
            min: "2025-12-01T00:00:00.000Z",
            max: "2026-11-27T12:00:00.000Z"
        });
    });

    it("uses all indexed history for yearly evolution", () => {
        const { filter, dateHistogram } = buildEvolutionAggregation(
            "year",
            new Date("2026-11-27T12:00:00.000Z")
        );

        expect(filter).toEqual({ match_all: {} });
        expect(dateHistogram.calendar_interval).toBe("year");
        expect(dateHistogram).not.toHaveProperty("extended_bounds");
    });

    it("rejects unsupported evolution intervals", () => {
        expect(() => buildEvolutionAggregation("day")).toThrow(
            "interval must be one of: hour, month, year"
        );
    });

    it("groups case variants and aliases into normalized level buckets", () => {
        expect(normalizeLevelBuckets([
            { key: "error", doc_count: 2 },
            { key: "ERROR", doc_count: 3 },
            { key: "err", doc_count: 4 },
            { key: "warn", doc_count: 1 }
        ])).toEqual([
            { level: "ERROR", count: 9 },
            { level: "WARNING", count: 1 }
        ]);
    });

    it("counts normalized error levels case-insensitively", () => {
        expect(buildLevelCountQuery(["ERROR", "ERR"])).toEqual({
            bool: {
                should: [
                    { term: { level: { value: "ERROR", case_insensitive: true } } },
                    { term: { level: { value: "ERR", case_insensitive: true } } }
                ],
                minimum_should_match: 1
            }
        });
    });
});
