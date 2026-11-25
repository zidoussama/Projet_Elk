const {
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
