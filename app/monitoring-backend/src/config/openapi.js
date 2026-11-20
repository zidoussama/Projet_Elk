const { z } = require("zod");
const {
    OpenAPIRegistry,
    OpenApiGeneratorV3,
    extendZodWithOpenApi
} = require("@asteasolutions/zod-to-openapi");

extendZodWithOpenApi(z);

const registry = new OpenAPIRegistry();

const fileType = z.enum(["csv", "json", "txt"]);
const fileStatus = z.enum(["validated", "ingesting", "indexed", "failed"]);
const ingestionType = z.enum(["api", "logstash"]);

const fileSchema = registry.register(
    "File",
    z.object({
        id: z.string().openapi({ example: "64f000000000000000000001" }),
        filename: z.string().openapi({ example: "logs.txt" }),
        type: fileType.openapi({ example: "txt" }),
        size: z.number().openapi({ example: 84 }),
        status: fileStatus.openapi({ example: "indexed" }),
        indexedCount: z.number().openapi({ example: 2 }),
        logCount: z.number().openapi({ example: 2 }),
        uploadId: z.string().openapi({ example: "u_64f000000000000000000001" }),
        sourceFormat: z.enum(["csv", "json", "txt"]).openapi({ example: "csv" }),
        ingestionType: ingestionType.openapi({ example: "api" }),
        indexingError: z.string().nullable().openapi({ example: null }),
        uploadDate: z.string().datetime().openapi({
            example: "2026-11-18T12:00:00.000Z"
        })
    })
);

const uploadResponse = registry.register(
    "UploadResponse",
    z.object({
        message: z.string().openapi({
            example: "File uploaded and indexed successfully"
        }),
        file: fileSchema
    })
);

const errorResponse = registry.register(
    "ErrorResponse",
    z.object({
        error: z.string().openapi({
            example: "File not found"
        })
    })
);

registry.registerPath({
    method: "post",
    path: "/api/logs/preview",
    tags: ["Logs"],
    summary: "Validate a log file and return an up-to-10-line preview",
    request: {
        body: {
            required: true,
            content: {
                "multipart/form-data": {
                    schema: {
                        type: "object",
                        required: ["file"],
                        properties: {
                            file: {
                                type: "string",
                                format: "binary",
                                description: "CSV, JSON, or TXT file"
                            }
                        }
                    }
                }
            }
        }
    },
    responses: {
        200: {
            description: "Validation result and file preview",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        required: ["filename", "type", "size", "lineCount", "preview", "validation"],
                        properties: {
                            filename: { type: "string" },
                            type: fileType,
                            size: { type: "integer" },
                            lineCount: { type: "integer" },
                            preview: { type: "array", items: { type: "string" } },
                            validation: {
                                type: "object",
                                required: ["valid", "message"],
                                properties: {
                                    valid: { type: "boolean" },
                                    message: { type: "string" }
                                }
                            }
                        }
                    }
                }
            }
        },
        400: {
            description: "Invalid or unsupported file",
            content: {
                "application/json": {
                    schema: errorResponse
                }
            }
        }
    }
});

registry.registerPath({
    method: "post",
    path: "/api/logs/upload",
    tags: ["Logs"],
    summary: "Upload and ingest a log file",
    request: {
        body: {
            required: true,
            content: {
                "multipart/form-data": {
                    schema: {
                        type: "object",
                        required: ["file"],
                        properties: {
                            file: {
                                type: "string",
                                format: "binary",
                                description: "CSV, JSON, or TXT file"
                            }
                        }
                    }
                }
            }
        }
    },
    responses: {
        201: {
            description: "File uploaded",
            content: {
                "application/json": {
                    schema: uploadResponse
                }
            }
        },
        400: {
            description: "Invalid or unsupported file",
            content: {
                "application/json": {
                    schema: errorResponse
                }
            }
        }
    }
});

registry.registerPath({
    method: "get",
    path: "/api/logs",
    tags: ["Logs"],
    summary: "List uploaded files",
    responses: {
        200: {
            description: "Stored file metadata",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        required: ["count", "files"],
                        properties: {
                            count: { type: "integer", example: 1 },
                            files: {
                                type: "array",
                                items: fileSchema
                            }
                        }
                    }
                }
            }
        }
    }
});

registry.registerPath({
    method: "get",
    path: "/api/logs/{id}/status",
    tags: ["Logs"],
    summary: "Get current upload status and Elasticsearch log count",
    request: {
        params: z.object({
            id: z.string().openapi({
                param: { name: "id", in: "path" },
                example: "64f000000000000000000001"
            })
        })
    },
    responses: {
        200: {
            description: "Current file status and indexed log count",
            content: {
                "application/json": {
                    schema: fileSchema
                }
            }
        },
        404: {
            description: "File not found",
            content: {
                "application/json": {
                    schema: errorResponse
                }
            }
        }
    }
});

registry.registerPath({
    method: "get",
    path: "/api/logs/{id}/download",
    tags: ["Logs"],
    summary: "Download a stored file",
    request: {
        params: z.object({
            id: z.string().openapi({
                param: { name: "id", in: "path" },
                example: "64f000000000000000000001"
            })
        })
    },
    responses: {
        200: {
            description: "Original uploaded file",
            content: {
                "text/plain": { schema: { type: "string", format: "binary" } },
                "text/csv": { schema: { type: "string", format: "binary" } },
                "application/json": { schema: { type: "string", format: "binary" } }
            }
        },
        404: {
            description: "File not found",
            content: {
                "application/json": { schema: errorResponse }
            }
        }
    }
});

registry.registerPath({
    method: "delete",
    path: "/api/logs/{id}",
    tags: ["Logs"],
    summary: "Delete a stored file",
    request: {
        params: z.object({
            id: z.string().openapi({
                param: { name: "id", in: "path" },
                example: "64f000000000000000000001"
            })
        })
    },
    responses: {
        200: {
            description: "File deleted",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: { type: "string", example: "File deleted successfully" },
                            file: fileSchema
                        }
                    }
                }
            }
        },
        400: {
            description: "Invalid MongoDB ID",
            content: {
                "application/json": { schema: errorResponse }
            }
        },
        404: {
            description: "File not found",
            content: {
                "application/json": { schema: errorResponse }
            }
        }
    }
});

function createOpenApiDocument() {
    const generator = new OpenApiGeneratorV3(registry.definitions);

    return generator.generateDocument({
        openapi: "3.0.0",
        info: {
            title: "Monitoring Backend API",
            version: "1.0.0",
            description: "API documentation for the ELK, MongoDB and Redis monitoring backend"
        },
        servers: [
            {
                url: process.env.BACKEND_URL || "http://localhost:3000",
                description: "Backend server"
            }
        ],
        tags: [
            {
                name: "Logs",
                description: "Log file upload, validation, storage and download"
            }
        ]
    });
}

module.exports = {
    createOpenApiDocument
};
