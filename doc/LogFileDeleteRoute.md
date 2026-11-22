# `DELETE /api/logs/:id`

## Purpose

Deletes one stored file record and its MongoDB binary content.

## Request

```http
DELETE http://localhost:3000/api/logs/64f000000000000000000001
Accept: application/json
```

`:id` must be a 24-character hexadecimal MongoDB ObjectId.

## Successful response

The route returns `200 OK`:

```json
{
  "message": "File deleted successfully",
  "file": {
    "id": "64f000000000000000000001",
    "filename": "logs.csv",
    "type": "csv",
    "status": "indexed",
    "uploadDate": "2026-11-22T14:30:00.000Z"
  }
}
```

Deleting the MongoDB record does not remove documents already indexed in
Elasticsearch. If indexed data must also be removed, perform that operation
through a separately authorized Elasticsearch retention or cleanup workflow.

## Errors

| Status | Condition | Response |
|---|---|---|
| `400` | Invalid identifier format | `{ "error": "Invalid file id" }` |
| `404` | No file matches the identifier | `{ "error": "File not found" }` |
| `500` | Database deletion failure | `{ "error": "Internal server error while deleting the file" }` |
