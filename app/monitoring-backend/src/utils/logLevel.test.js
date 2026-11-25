const {
    getLogLevelVariants,
    normalizeLogLevel,
    normalizeLogRecord
} = require("./logLevel");

describe("log level normalization", () => {
    it.each([
        [" info ", "INFO"],
        ["debug", "DEBUG"],
        ["warn", "WARNING"],
        ["err", "ERROR"],
        ["fatal", "CRITICAL"],
        ["notice", "NOTICE"]
    ])("normalizes %s to %s", (input, expected) => {
        expect(normalizeLogLevel(input)).toBe(expected);
    });

    it("leaves records without a string level unchanged", () => {
        const record = { message: "no level supplied" };
        expect(normalizeLogRecord(record)).toBe(record);
        expect(normalizeLogLevel(" ")).toBeUndefined();
    });

    it("normalizes the level without changing other log fields", () => {
        expect(normalizeLogRecord({ level: " error ", message: "failed" }))
            .toEqual({ level: "ERROR", message: "failed" });
    });

    it("returns supported aliases for matching legacy levels", () => {
        expect(getLogLevelVariants("warn")).toEqual(["WARNING", "WARN"]);
        expect(getLogLevelVariants("notice")).toEqual(["NOTICE"]);
    });
});
