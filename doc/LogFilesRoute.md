# `GET /api/logs`

## Purpose

Lists stored log-file metadata in reverse upload order. Binary file content is
excluded from the response.

## Request

```http
GET http://localhost:3000/api/logs
Accept: application/json
```

No query parameters or request body are required.

## Response

The route returns `200 OK`:

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
      "logCount": 2,
      "uploadId": "u_20261122_00000001",
      "sourceFormat": "csv",
      "ingestionType": "logstash",
      "indexedAt": "2026-11-22T14:30:01.000Z",
      "indexingError": null,
      "uploadDate": "2026-11-22T14:30:00.000Z"
    }
  ]
}
```

Before querying MongoDB, the route attempts to reconcile files discovered in
Logstash/Elasticsearch. A temporary reconciliation failure is logged and does not
prevent MongoDB metadata from being returned.

## Errors

Database failures return `500 Internal Server Error`:

```json
{ "error": "Internal server error while listing files" }
```

## File status values

`validated`, `ingesting`, `indexed`, and `failed` are described in the
[file lifecycle documentation](LogFileStatusRoute.md).
