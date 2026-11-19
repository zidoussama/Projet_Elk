const fs = require("node:fs");
const path = require("node:path");
const { createOpenApiDocument } = require("./src/config/openapi");

const outputFile = path.resolve(__dirname, "docs/swagger-output.json");
fs.mkdirSync(path.dirname(outputFile), { recursive: true });
fs.writeFileSync(
    outputFile,
    `${JSON.stringify(createOpenApiDocument(), null, 2)}\n`
);

console.log("Swagger documentation generated successfully!");
