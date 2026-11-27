# `GET /api/logs/:id/status`

## Purpose

Returns the current metadata and ingestion status for one uploaded file. Before
responding, it checks Elasticsearch for documents carrying the file's `upload_id`
and updates the MongoDB record when indexing is detected.

## Request

```http
GET http://localhost:3000/api/logs/64f000000000000000000001/status
Accept: application/json
```

`:id` must be a valid MongoDB ObjectId.

## Response

The route returns `200 OK` with the file document excluding binary `content`:

```json
{
  "_id": "64f000000000000000000001",
  "filename": "logs.csv",
  "type": "csv",
  "size": 132,
  "status": "indexed",
  "indexedCount": 2,
  "logCount": 2,
  "uploadId": "u_20261122_00000001",
  "sourceFormat": "csv",
  "ingestionType": "logstash",
  "indexedAt": "2026-11-22T14:30:01.000Z",
  "uploadDate": "2026-11-22T14:30:00.000Z"
}
```

## Errors

| Status | Condition | Example |
|---|---|---|
| `400` | The ID is not a valid MongoDB ObjectId | `{ "error": "Invalid file id" }` |
| `404` | No file matches the ID | `{ "error": "File not found" }` |
| `500` | Reconciliation or database failure | `{ "error": "..." }` |

The route is useful for polling after [upload](LogUploadRoute.md) when indexing is
handled asynchronously by Logstash.
