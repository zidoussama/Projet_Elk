const {
    validateLogFile,
    parseCsvRows
} = require("./validateLogFile");

function createResponse() {
    return {
        statusCode: null,
        body: null,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(body) {
            this.body = body;
            return this;
        }
    };
}

describe("validateLogFile middleware", () => {
    it("accepts a valid JSON file", () => {
        const req = {
            file: {
                originalname: "logs.json",
                buffer: Buffer.from("{\"level\":\"info\"}")
            }
        };
        const res = createResponse();
        let called = false;

        validateLogFile(req, res, () => {
            called = true;
        });

        expect(called).toBe(true);
    });

    it("rejects invalid JSON with a clear error", () => {
        const req = {
            file: {
                originalname: "logs.json",
                buffer: Buffer.from("{\"level\":")
            }
        };
        const res = createResponse();

        validateLogFile(req, res, () => {});

        expect(res.statusCode).toBe(400);
        expect(res.body.error).toContain("Invalid JSON file");
    });

    it("rejects CSV rows with inconsistent columns", () => {
        const req = {
            file: {
                originalname: "logs.csv",
                buffer: Buffer.from("level,message\nINFO\n")
            }
        };
        const res = createResponse();

        validateLogFile(req, res, () => {});

        expect(res.statusCode).toBe(400);
        expect(res.body.error).toContain("row 2");
    });

    it("rejects unsupported extensions", () => {
        const req = {
            file: {
                originalname: "logs.xml",
                buffer: Buffer.from("<logs />")
            }
        };
        const res = createResponse();

        validateLogFile(req, res, () => {});

        expect(res.statusCode).toBe(400);
        expect(res.body.error).toContain("Accepted extensions");
    });

    it("parses quoted CSV fields", () => {
        expect(parseCsvRows("level,message\nINFO,\"started, ready\"\n"))
            .toEqual([["level", "message"], ["INFO", "started, ready"]]);
    });
});
