# Monitoring Backend Route Documentation

This directory documents each custom HTTP route independently. The examples use:

```text
http://localhost:3000
```

Interactive OpenAPI documentation is available at
[`/api-docs`](http://localhost:3000/api-docs) when the backend is running.
Authentication and Better Auth plugin routes are documented separately in
[Authentication](Authentication.md) and [Two-Factor Authentication](TwoFactorAuthentication.md).

## Route catalog

| Method | Route | Documentation |
|---|---|---|
| `GET` | `/health` | [Health](HealthRoute.md) |
| `GET` | `/api/dashboard/stats` | [Dashboard statistics](DashboardStatsRoute.md) |
| `POST` | `/api/logs/preview` | [Preview a log file](LogPreviewRoute.md) |
| `POST` | `/api/logs/upload` | [Upload a log file](LogUploadRoute.md) |
| `GET` | `/api/logs` | [List log files](LogFilesRoute.md) |
| `GET` | `/api/logs/:id/status` | [Get file status](LogFileStatusRoute.md) |
| `GET` | `/api/logs/stream` | [Stream file status](LogFileStreamRoute.md) |
| `GET` | `/api/logs/:id/download` | [Download a log file](LogFileDownloadRoute.md) |
| `DELETE` | `/api/logs/:id` | [Delete a log file](LogFileDeleteRoute.md) |
| `GET` | `/api/logs/search` | [Search logs](LogSearchRoute.md) |
| `GET` | `/api/logs/search/export` | [Export logs](LogExportRoute.md) |

## Cross-cutting behavior

- Unless noted otherwise, requests do not require a request body.
- File endpoints accept only `csv`, `json`, and `txt` files.
- Uploaded files are persisted in MongoDB and indexed through the ELK pipeline.
- Log search and dashboard routes read from the `logs-ecom-*` Elasticsearch index pattern.
- Error responses use a JSON object with an `error` property.
- The current implementation does not apply custom authentication middleware to these routes.
  Protect them before exposing the service outside a trusted local environment.
