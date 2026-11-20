const mongoose = require("mongoose");
const {
    buildDocuments,
    parseCsvRows
} = require("./fileIngestion");

function createFile(type, content) {
    return {
        _id: new mongoose.Types.ObjectId(),
        filename: `test.${type}`,
        type,
        content: Buffer.from(content)
    };
}

describe("file ingestion documents", () => {
    it("builds indexed documents from CSV records", () => {
        const file = createFile("csv", "timestamp,level,message\n2026-11-18T10:00:00Z,INFO,Started\n");
        const documents = buildDocuments(file);

        expect(documents).toHaveLength(1);
        expect(documents[0].level).toBe("INFO");
        expect(documents[0].source_format).toBe("csv");
    });

    it("builds indexed documents from JSON arrays", () => {
        const file = createFile("json", '[{"level":"ERROR","message":"Failed"}]');
        const documents = buildDocuments(file);

        expect(documents).toHaveLength(1);
        expect(documents[0].level).toBe("ERROR");
        expect(documents[0].source_format).toBe("json");
    });

    it("builds one indexed document per TXT line", () => {
        const file = createFile("txt", "First line\nSecond line\n");
        const documents = buildDocuments(file);

        expect(documents).toHaveLength(2);
        expect(documents[0].message).toBe("First line");
        expect(documents[1].level).toBe("INFO");
    });

    it("parses quoted CSV fields", () => {
        expect(parseCsvRows("level,message\nINFO,\"Started, ready\"\n"))
            .toEqual([
                ["level", "message"],
                ["INFO", "Started, ready"]
            ]);
    });
});
