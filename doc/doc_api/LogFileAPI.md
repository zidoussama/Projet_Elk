# Log File Import API

## Overview

The backend provides API routes for uploading, validating, listing, downloading,
and deleting log files. Files are stored in MongoDB using the `File` model.

Base URL:

```text
http://localhost:3000
```

Log file routes are mounted under:

```text
/api/logs
```

Implementation:

- [fileRoutes.js](../app/monitoring-backend/src/routes/fileRoutes.js) - Express
  routes and Multer configuration.
- [validateLogFile.js](../app/monitoring-backend/src/middleware/validateLogFile.js)
  - request validation middleware.
- [FileController.js](../app/monitoring-backend/controllers/FileController.js) -
  database and download operations.
- [FilesModels.js](../app/monitoring-backend/Models/FilesModels.js) - MongoDB
  file model.
- [fileIngestion.js](../app/monitoring-backend/src/services/fileIngestion.js) -
  Elasticsearch ingestion and status transition service.

## File status lifecycle

Every uploaded file passes through these MongoDB statuses:

```text
validated
  -> ingesting
  -> indexed
     or
  -> failed
```

| Status | Meaning |
|---|---|
| `validated` | The middleware accepted the file format and content, and MongoDB saved the record |
| `ingesting` | The backend is converting file records and sending them to Elasticsearch |
| `indexed` | Elasticsearch accepted the documents |
| `failed` | Elasticsearch or document conversion failed |

The upload request waits for the Elasticsearch bulk operation. The returned
status is therefore the final `indexed` or `failed` state, while `ingesting`
is persisted during processing and can be observed if a status is read concurrently.

The ingestion service:

1. Reads the stored file from MongoDB.
2. Updates it to `ingesting`.
3. Converts CSV rows, JSON objects/arrays, or TXT lines into documents.
4. Adds `upload_id`, `source_file`, and `source_format` metadata.
5. Bulk-indexes documents into `logs-ecom-YYYY.MM.dd`.
6. Sets `indexed`, `indexedCount`, and `indexedAt` after success.
7. Sets `failed` and `indexingError` after an ingestion error.

The backend indexes uploaded data directly into Elasticsearch. The existing
Logstash pipelines remain available for files already delivered to the mounted
`docker/elk/logs` directory. They use the same `logs-ecom-*` Elasticsearch index
family and source metadata conventions.

## Postman setup

For upload requests, select **Body > form-data** and add:

```text
Key: file
Type: File
Value: select the log file
```

Optional request headers:

```http
Origin: http://localhost:5173
Content-Type: multipart/form-data
```

Do not set `Content-Type` manually in Postman when using multipart form-data.
Postman creates the required multipart boundary.

The default maximum file size is 100 MB. The limit can be changed with:

```text
MAX_LOG_FILE_SIZE_MB=100
```

The environment variable must be a positive number.

## Supported file types

| Extension | Validation |
|---|---|
| `.csv` | Non-empty header, consistent number of columns, valid quoted fields |
| `.json` | Valid JSON syntax |
| `.txt` | Plain text file that is not empty |

Unsupported extensions and empty files are rejected.

## Upload a file

```http
POST http://localhost:3000/api/logs/upload
```

Multipart field:

```text
file
```

Example Postman setup:

```text
file = logs.csv
```

Example CSV:

```csv
timestamp,level,message
2026-11-18T10:00:00Z,INFO,Application started
2026-11-18T10:01:00Z,ERROR,Database connection failed
```

Success response:

```http
201 Created
```

```json
{
  "message": "File uploaded and indexed successfully",
  "file": {
    "id": "64f000000000000000000001",
    "filename": "logs.csv",
    "type": "csv",
    "size": 132,
    "status": "indexed",
    "indexedCount": 2,
    "indexingError": null,
    "uploadDate": "2026-11-18T12:00:00.000Z"
  }
}
```

If Elasticsearch is unavailable or indexing rejects a document:

```http
201 Created
```

```json
{
  "message": "File uploaded but indexing failed",
  "file": {
    "id": "64f000000000000000000001",
    "filename": "logs.csv",
    "type": "csv",
    "size": 132,
    "status": "failed",
    "indexedCount": 0,
    "indexingError": "Connection refused",
    "uploadDate": "2026-11-18T12:00:00.000Z"
  }
}
```

The file remains stored in MongoDB when indexing fails, so it can be inspected,
redownloaded, or retried by a future ingestion endpoint or worker.

## Validation behavior

The upload route executes this pipeline:

```text
Multer receives multipart file
  -> validateLogFile middleware
  -> extension and size checks
  -> JSON, CSV, or TXT validation
  -> MongoDB persistence
  -> status: ingesting
  -> Elasticsearch bulk index
  -> status: indexed or failed
```

Malformed JSON example:

```json
{
  "level":
}
```

Response:

```http
400 Bad Request
```

```json
{
  "error": "Invalid JSON file: the file does not contain valid JSON syntax"
}
```

Inconsistent CSV example:

```csv
timestamp,level,message
2026-11-18T10:00:00Z,INFO
```

Response:

```json
{
  "error": "Invalid CSV file: row 2 has 2 columns; expected 3"
}
```

Unsupported extension response:

```json
{
  "error": "Unsupported file type. Accepted extensions are .csv, .json, and .txt"
}
```

Oversized file response:

```json
{
  "error": "File is too large. Maximum allowed size is 100 MB"
}
```

Missing file response:

```json
{
  "error": "A file is required in the multipart field named 'file'"
}
```

## List all files

```http
GET http://localhost:3000/api/logs
```

No body is required.

Success response:

```http
200 OK
```

```json
{
  "count": 2,
  "files": [
    {
      "_id": "64f000000000000000000001",
      "filename": "logs.csv",
      "type": "csv",
      "size": 132,
      "status": "indexed",
      "indexedCount": 2,
      "indexedAt": "2026-11-18T12:00:01.000Z",
      "indexingError": null,
      "uploadDate": "2026-11-18T12:00:00.000Z"
    },
    {
      "_id": "64f000000000000000000002",
      "filename": "application.txt",
      "type": "txt",
      "size": 84,
      "status": "failed",
      "indexedCount": 0,
      "indexedAt": null,
      "indexingError": "Connection refused",
      "uploadDate": "2026-11-18T11:55:00.000Z"
    }
  ]
}
```

The list excludes file binary content.

## Download a file

```http
GET http://localhost:3000/api/logs/:id/download
```

Example:

```text
GET http://localhost:3000/api/logs/64f000000000000000000001/download
```

No body is required. The response is downloaded using the original filename.
The `Content-Type` is selected from the stored file type:

| Type | Content-Type |
|---|---|
| `.csv` | `text/csv` |
| `.json` | `application/json` |
| `.txt` | `text/plain` |

If the ID does not exist:

```http
404 Not Found
```

```json
{
  "error": "File not found"
}
```

## Delete a file

```http
DELETE http://localhost:3000/api/logs/:id
```

Example:

```text
DELETE http://localhost:3000/api/logs/64f000000000000000000001
```

Success response:

```http
200 OK
```

```json
{
  "message": "File deleted successfully",
  "file": {
    "id": "64f000000000000000000001",
    "filename": "logs.csv",
    "type": "csv",
    "status": "indexed",
    "uploadDate": "2026-11-18T12:00:00.000Z"
  }
}
```

Invalid MongoDB ID:

```http
400 Bad Request
```

```json
{
  "error": "Invalid file id"
}
```

Unknown file ID:

```http
404 Not Found
```

```json
{
  "error": "File not found"
}
```

## MongoDB model

The `File` document contains:

| Field | Type | Description |
|---|---|---|
| `filename` | String | Original uploaded filename |
| `type` | String | `csv`, `json`, or `txt` |
| `size` | Number | File size in bytes |
| `content` | Buffer | Binary file content |
| `status` | String | `validated`, `ingesting`, `indexed`, or `failed` |
| `logcontent` | String | Optional processed text content |
| `indexedCount` | Number | Number of documents indexed into Elasticsearch |
| `indexedAt` | Date | Timestamp of successful Elasticsearch indexing |
| `indexingError` | String | Elasticsearch or conversion error after a failed ingest |
| `uploadDate` | Date | Upload timestamp |

## Endpoint summary

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/logs/upload` | Upload, validate, and save a file |
| `GET` | `/api/logs` | List stored file metadata |
| `GET` | `/api/logs/:id/download` | Download a stored file |
| `DELETE` | `/api/logs/:id` | Delete a stored file |
