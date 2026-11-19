const fs = require("node:fs");
const path = require("node:path");
const swaggerUi = require("swagger-ui-express");
const { createOpenApiDocument } = require("./openapi");

const outputFile = path.resolve(__dirname, "../../docs/swagger-output.json");

function loadSwaggerDocument() {
    if (!fs.existsSync(outputFile)) {
        return createOpenApiDocument();
    }

    return JSON.parse(fs.readFileSync(outputFile, "utf8"));
}

function mountSwagger(app) {
    const document = loadSwaggerDocument();

    app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(document));
    app.get("/api-docs.json", (req, res) => {
        res.status(200).json(document);
    });
}

module.exports = {
    mountSwagger,
    loadSwaggerDocument
};