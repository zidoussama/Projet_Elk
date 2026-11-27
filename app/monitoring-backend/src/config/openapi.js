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

const healthResponse = registry.register(
    "HealthResponse",
    z.object({
        status: z.enum(["OK", "DEGRADED"]),
        timestamp: z.string().datetime(),
        services: z.object({
            mongodb: z.enum(["UP", "DOWN"]),
            redis: z.enum(["UP", "DOWN"]),
            elasticsearch: z.enum(["UP", "DOWN"])
        })
    })
);

registry.registerPath({
    method: "get",
    path: "/health",
    tags: ["Health"],
    summary: "Check the health of MongoDB, Redis, and Elasticsearch",
    responses: {
        200: {
            description: "All services are healthy",
            content: {
                "application/json": {
                    schema: healthResponse
                }
            }
        },
        503: {
            description: "One or more services are unavailable",
            content: {
                "application/json": {
                    schema: healthResponse
                }
            }
        }
    }
});

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
    path: "/api/logs/search",
    tags: ["Logs"],
    summary: "Search logs with text, level, service, date range, sorting and pagination",
    request: {
        query: z.object({
            text: z.string().optional(),
            level: z.string().optional(),
            service: z.string().optional(),
            from: z.string().datetime().optional(),
            to: z.string().datetime().optional(),
            page: z.coerce.number().int().positive().optional(),
            sort: z.enum(["asc", "desc"]).optional()
        })
    },
    responses: {
        200: {
            description: "Paginated matching logs",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        required: ["page", "size", "total", "results"],
                        properties: {
                            page: { type: "integer", example: 1 },
                            size: { type: "integer", example: 50 },
                            total: { type: "integer", example: 120 },
                            results: { type: "array", items: { type: "object" } }
                        }
                    }
                }
            }
        },
        500: {
            description: "Search failed",
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
    path: "/api/logs/search/export",
    tags: ["Logs"],
    summary: "Export matching logs as CSV",
    request: {
        query: z.object({
            text: z.string().optional(),
            level: z.string().optional(),
            service: z.string().optional(),
            from: z.string().datetime().optional(),
            to: z.string().datetime().optional(),
            sort: z.enum(["asc", "desc"]).optional()
        })
    },
    responses: {
        200: {
            description: "CSV file",
            content: {
                "text/csv": {
                    schema: { type: "string", format: "binary" }
                }
            }
        }
    }
});

registry.registerPath({
    method: "get",
    path: "/api/dashboard/stats",
    tags: ["Dashboard"],
    summary: "Get dashboard log and file statistics",
    request: {
        query: z.object({
            interval: z.enum(["hour", "month", "year"]).optional().openapi({
                description: "Log evolution bucket size. Defaults to hour."
            })
        })
    },
    responses: {
        200: {
            description: "Aggregated dashboard statistics",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        required: [
                            "totalLogs",
                            "logsToday",
                            "errorLogs",
                            "criticalLogs",
                            "errorCriticalLogs",
                            "importedFiles",
                            "hourlyEvolution",
                            "levelDistribution"
                        ],
                        properties: {
                            totalLogs: { type: "integer" },
                            logsToday: { type: "integer" },
                            errorLogs: { type: "integer" },
                            criticalLogs: { type: "integer" },
                            errorCriticalLogs: { type: "integer" },
                            importedFiles: { type: "integer" },
                            hourlyEvolution: {
                                description: "Log counts grouped by the requested interval; the hour field is the UTC bucket start.",
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        hour: { type: "string", format: "date-time" },
                                        count: { type: "integer" }
                                    }
                                }
                            },
                            levelDistribution: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        level: { type: "string" },
                                        count: { type: "integer" }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        500: {
            description: "Dashboard aggregation failed",
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
                name: "Health",
                description: "Backend and dependency health checks"
            },
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
