const { buildFilePreview } = require("./FilePreviewController");

describe("file preview", () => {
    it("returns at most 10 preview lines and validation success", () => {
        const content = Array.from(
            { length: 12 },
            (_, index) => `line ${index + 1}`
        ).join("\n");

        const preview = buildFilePreview({
            originalname: "logs.txt",
            buffer: Buffer.from(content)
        });

        expect(preview.preview).toHaveLength(10);
        expect(preview.preview[0]).toBe("line 1");
        expect(preview.preview[9]).toBe("line 10");
        expect(preview.lineCount).toBe(12);
        expect(preview.validation.valid).toBe(true);
    });

    it("returns JSON records as preview lines", () => {
        const preview = buildFilePreview({
            originalname: "logs.json",
            buffer: Buffer.from('[{"message":"one"},{"message":"two"}]')
        });

        expect(preview.preview).toEqual([
            '{"message":"one"}',
            '{"message":"two"}'
        ]);
    });
});
