# `POST /api/logs/preview`

## Purpose

Validates a log file without persisting it and returns a small preview for UI
confirmation before upload.

## Request

Send a `multipart/form-data` request with one required field named `file`:

```http
POST http://localhost:3000/api/logs/preview
Content-Type: multipart/form-data
```

In Postman, choose **Body > form-data**, set `file` to type **File**, and select a
`.csv`, `.json`, or `.txt` file. Do not set the multipart `Content-Type` header
manually; the client must add its boundary.

The default maximum size is 100 MB and can be changed with
`MAX_LOG_FILE_SIZE_MB`.

## Successful response

The route returns `200 OK`:

```json
{
  "filename": "logs.csv",
  "type": "csv",
  "size": 132,
  "lineCount": 3,
  "preview": [
    "timestamp,level,message",
    "2026-11-22T10:00:00Z,INFO,Application started",
    "2026-11-22T10:01:00Z,ERROR,Database connection failed"
  ],
  "validation": {
    "valid": true,
    "message": "File validation succeeded"
  }
}
```

`preview` contains at most ten non-empty lines. JSON objects are represented as
one serialized JSON string; JSON arrays contribute one serialized string per item.
`size` is measured in bytes.

## Validation errors

Invalid input returns `400 Bad Request` with an `error` property. Examples:

```json
{ "error": "A file is required in the multipart field named 'file'" }
```

```json
{ "error": "Invalid JSON file: the file does not contain valid JSON syntax" }
```

```json
{ "error": "Unsupported file type. Accepted extensions are .csv, .json, and .txt" }
```

Validation checks extension, size, non-empty content, JSON syntax, CSV headers,
CSV column counts, and closed quoted CSV fields. This route does not create a
MongoDB record or write to Elasticsearch.
