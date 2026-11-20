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
            level: "error",
            service: "orders",
            from: "2026-11-20T10:00:00Z",
            to: "2026-11-20T11:00:00Z"
        });

        expect(query.bool.filter).toContainEqual({
            term: { level: "ERROR" }
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
