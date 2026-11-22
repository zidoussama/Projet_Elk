# `GET /api/logs/:id/download`

## Purpose

Downloads the original binary content stored for an uploaded file.

## Request

```http
GET http://localhost:3000/api/logs/64f000000000000000000001/download
```

`:id` is the MongoDB file identifier. No request body is required.

## Successful response

The route returns `200 OK` and the original file bytes. It sets:

```http
Content-Disposition: attachment; filename="logs.csv"
Content-Type: text/csv
```

The content type is selected from the stored file type:

| Type | Content-Type |
|---|---|
| `csv` | `text/csv` |
| `json` | `application/json` |
| `txt` | `text/plain` |

The filename is sanitized to its base name before it is placed in the download
header.

## Errors

If the file does not exist, the route returns `404 Not Found`:

```json
{ "error": "File not found" }
```

Database or retrieval failures return `500 Internal Server Error`:

```json
{ "error": "Internal server error while retrieving the file" }
```
