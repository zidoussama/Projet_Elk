# `POST /api/logs/upload`

## Purpose

Validates, stores, and submits a log file to the ELK ingestion pipeline. Supported
formats are CSV, JSON, and plain text.

## Request

```http
POST http://localhost:3000/api/logs/upload
Content-Type: multipart/form-data
```

Include one required multipart field:

```text
file = logs.csv
```

The default maximum file size is 100 MB. Configure it with
`MAX_LOG_FILE_SIZE_MB`. The request validates the file before saving it to MongoDB.

## Successful response

The route returns `201 Created`:

```json
{
  "message": "File uploaded and indexed successfully",
  "file": {
    "_id": "64f000000000000000000001",
    "filename": "logs.csv",
    "type": "csv",
    "size": 132,
    "status": "indexed",
    "indexedCount": 2,
    "uploadId": "u_20261122_00000001",
    "sourceFormat": "csv",
    "ingestionType": "logstash",
    "indexedAt": "2026-11-22T14:30:01.000Z",
    "uploadDate": "2026-11-22T14:30:00.000Z"
  }
}
```

The persisted status normally transitions through `validated` and `ingesting` to
`indexed`. The service writes the uploaded content into the configured Logstash
watch directory, where Logstash indexes it into `logs-ecom-*`.

If the handoff or indexing has not completed, the response can instead contain:

```json
{
  "message": "File uploaded and Logstash ingestion started",
  "file": {
    "status": "ingesting"
  }
}
```

If processing fails, the route still returns `201 Created` with
`message: "File uploaded but indexing failed"` and a file status of `failed`.
The `indexingError` field contains the recorded failure message.

## Validation errors

Invalid files return `400 Bad Request`. Missing files, unsupported extensions,
empty files, malformed JSON, inconsistent CSV rows, and oversized files are
rejected before persistence.

Unexpected persistence or processing failures return `500 Internal Server Error`:

```json
{ "error": "Internal server error while saving the file" }
```

## Related routes

Use [Preview](LogPreviewRoute.md) before upload when a client needs to display a
confirmation screen. Use [File status](LogFileStatusRoute.md) to reconcile the
asynchronous Logstash result.
