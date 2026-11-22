const {
    formatUtcHour
} = require("./dashboardStats");

describe("dashboard statistics helpers", () => {
    it("formats an hourly bucket as an ISO UTC hour", () => {
        expect(formatUtcHour("2026-11-20T11:30:00.000Z"))
            .toBe("2026-11-20T11:00:00.000Z");
    });

    it("returns null for an invalid hourly bucket", () => {
        expect(formatUtcHour("invalid")).toBeNull();
    });
});
