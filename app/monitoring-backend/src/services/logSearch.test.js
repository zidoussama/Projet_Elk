const {
    buildSearchQuery,
    parsePage,
    buildSort,
    logsToCsv
} = require("./logSearch");

describe("log search", () => {
    it("combines text, level, service and date filters", () => {
        const query = buildSearchQuery({
            text: "payment",
            level: " error ",
            service: "orders",
            from: "2026-11-20T10:00:00Z",
            to: "2026-11-20T11:00:00Z"
        });

        expect(query.bool.filter).toContainEqual({
            bool: {
                should: [
                    { term: { level: { value: "ERROR", case_insensitive: true } } },
                    { term: { level: { value: "ERR", case_insensitive: true } } }
                ],
                minimum_should_match: 1
            }
        });
        expect(query.bool.filter).toContainEqual({
            term: { service: "orders" }
        });
        expect(query.bool.filter).toContainEqual({
            range: {
                "@timestamp": {
                    gte: "2026-11-20T10:00:00Z",
                    lte: "2026-11-20T11:00:00Z"
                }
            }
        });
        expect(query.bool.must[0].multi_match.query).toBe("payment");
    });

    it("normalizes warning aliases in level filters and exported logs", () => {
        expect(buildSearchQuery({ level: "warn" }).bool.filter)
            .toContainEqual({
                bool: {
                    should: [
                        { term: { level: { value: "WARNING", case_insensitive: true } } },
                        { term: { level: { value: "WARN", case_insensitive: true } } }
                    ],
                    minimum_should_match: 1
                }
            });

        const csv = logsToCsv([{ level: "fatal", message: "Stopped" }]);
        expect(csv).toContain('"CRITICAL"');
        expect(csv).not.toContain('"fatal"');
    });

    it("uses 50 logs per page and defaults to page 1", () => {
        expect(parsePage({ page: "3" })).toEqual({ page: 3, size: 50 });
        expect(parsePage({ page: "invalid" })).toEqual({ page: 1, size: 50 });
    });

    it("sorts newest logs by default", () => {
        expect(buildSort()).toEqual([{ "@timestamp": "desc" }]);
        expect(buildSort("asc")).toEqual([{ "@timestamp": "asc" }]);
    });

    it("exports flattened log fields to CSV", () => {
        const csv = logsToCsv([
            { level: "ERROR", message: 'Payment "failed"' },
            { level: "INFO", service: "orders" }
        ]);

        expect(csv).toContain('"level","message","service"');
        expect(csv).toContain('"Payment ""failed"""');
    });
});
