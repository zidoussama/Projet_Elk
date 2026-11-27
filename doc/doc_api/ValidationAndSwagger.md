# Log Validation and Swagger API Documentation

## Overview

This document describes the validation and API documentation features added to the
monitoring backend.

The backend now:

- accepts multipart log-file uploads;
- validates file presence, extension, size, JSON syntax, and CSV structure;
- stores accepted files and forwards their contents to Elasticsearch;
- exposes an OpenAPI 3 document;
- exposes an interactive Swagger UI and a downloadable OpenAPI JSON document.

## Upload validation

The log upload route is:

```text
POST /api/logs/upload
```

The route uses Multer memory storage and sends the multipart file through
`validateLogFile` before the controller persists or ingests it.

### Accepted file types

Only these extensions are accepted:

| Extension | Validation |
|---|---|
| `.csv` | The file must contain a non-empty header and consistent column counts |
| `.json` | The complete file must contain valid JSON syntax |
| `.txt` | The file must not be empty |

### Validation checks

The validation middleware rejects a request when:

- the `file` multipart field is missing;
- the uploaded value is not a valid file buffer;
- the extension is not `.csv`, `.json`, or `.txt`;
- the file exceeds `MAX_LOG_FILE_SIZE_MB`;
- the file is empty;
- JSON syntax is invalid;
- a CSV header is empty or missing;
- a CSV row has fewer or more columns than the header;
- a CSV quoted field is not closed.

The default maximum file size is 100 MB. It can be configured in
`app/monitoring-backend/.env`:

```text
MAX_LOG_FILE_SIZE_MB=100
```

The configured value must be a positive number.

### Validation flow

```text
multipart request
  -> Multer stores the file in memory
  -> extension and size checks
  -> JSON or CSV syntax checks
  -> TXT empty-file check
  -> controller stores the file in MongoDB
  -> status changes from validated to ingesting
  -> Elasticsearch bulk indexing
  -> status changes to indexed or failed
```

## Validation responses

Most validation failures return `400 Bad Request` with an `error` field.

Examples:

```json
{
  "error": "Unsupported file type. Accepted extensions are .csv, .json, and .txt"
}
```

```json
{
  "error": "The uploaded file is empty"
}
```

```json
{
  "error": "Invalid JSON file: the file does not contain valid JSON syntax"
}
```

```json
{
  "error": "Invalid CSV file: row 3 has 2 columns; expected 3"
}
```

A file that is too large is also returned as `400 Bad Request`.

## Elasticsearch ingestion status

Accepted files use this status lifecycle:

```text
validated -> ingesting -> indexed
                       -> failed
```

| Status | Meaning |
|---|---|
| `validated` | The file passed upload validation and was saved in MongoDB |
| `ingesting` | The file is being converted and sent to Elasticsearch |
| `indexed` | The Elasticsearch bulk operation completed successfully |
| `failed` | Elasticsearch indexing or document conversion failed |

If Elasticsearch indexing fails, the MongoDB file remains available and the API
returns the file metadata with `status: "failed"` and an `indexingError` message.

## Swagger and OpenAPI integration

The backend uses:

- `swagger-ui-express` to render Swagger UI;
- `zod` for data schemas;
- `@asteasolutions/zod-to-openapi` to convert Zod schemas into an OpenAPI 3 document.

The implementation is split across:

| File | Responsibility |
|---|---|
| `src/config/openapi.js` | Defines reusable schemas and documents log routes |
| `src/config/swagger.js` | Loads or generates the document and mounts Swagger middleware |
| `swagger.cjs` | Generates the standalone JSON specification |
| `docs/swagger-output.json` | Generated OpenAPI document |
| `src/server.js` | Mounts Swagger before backend routes start |

## API documentation endpoints

Start the backend and open:

```text
http://localhost:3000/api-docs
```

Swagger UI presents the documented endpoints and permits inspection of request
schemas and response structures.

The raw OpenAPI 3 JSON is available at:

```text
http://localhost:3000/api-docs.json
```

The standalone file is:

```text
app/monitoring-backend/docs/swagger-output.json
```

## Documented log routes

| Method | Route | Description |
|---|---|---|
| `POST` | `/api/logs/upload` | Upload and ingest a CSV, JSON, or TXT file |
| `GET` | `/api/logs` | List stored file metadata |
| `GET` | `/api/logs/{id}/download` | Download the original stored file |
| `DELETE` | `/api/logs/{id}` | Delete a stored file |

The OpenAPI document includes request content types, path parameters, reusable
`File`, `UploadResponse`, and `ErrorResponse` schemas, and response status
definitions.

## Generate Swagger documentation

Generate the JSON specification explicitly:

```powershell
cd app\monitoring-backend
npm run swagger
```

The `swagger` script executes `swagger.cjs`, creates
`docs/swagger-output.json`, and formats it as JSON.

Swagger generation also runs automatically before:

- `npm start`;
- `npm run dev`.

This behavior is configured by the `prestart` and `predev` npm scripts.

## Runtime configuration

The OpenAPI server URL uses:

```text
BACKEND_URL
```

It falls back to:

```text
http://localhost:3000
```

An example server configuration is:

```text
BACKEND_URL=http://localhost:3000
MAX_LOG_FILE_SIZE_MB=100
FRONTEND_URL=http://localhost:5173
```

## Validation and documentation testing

The focused verification for this feature is:

```powershell
cd app\monitoring-backend
npm run swagger
npm test
npm run lint
```

Expected results:

- the Swagger JSON file is created or refreshed;
- unit tests pass;
- lint reports no blocking errors;
- `/api-docs` renders the Swagger UI;
- `/api-docs.json` returns valid JSON;
- invalid multipart uploads return `400` without persisting or ingesting the file;
- valid uploads return `201` and include the resulting file status.

## Related documentation

- [Log File Import API](LogFileAPI.md)
- [Authentication](Authentication.md)
- [Application and Monitoring Documentation](ApplicationDocumentation.md)
