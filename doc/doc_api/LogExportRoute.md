# `GET /api/logs/search/export`

## Purpose

Exports all log events matching the supported search filters as a CSV download.
This route is intended for reports and offline analysis rather than paginated UI
display.

## Request

```http
GET http://localhost:3000/api/logs/search/export?service=checkout&sort=asc
Accept: text/csv
```

Supported query parameters are the same filters as
[log search](LogSearchRoute.md), except pagination is not applied:
`text`/`q`, `level`, `service`, `from`/`start`, `to`/`end`, and `sort`.

The implementation requests up to 10,000 matching Elasticsearch documents.

## Successful response

The route returns `200 OK` with:

```http
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="logs-export.csv"
```

Values are quoted and embedded double quotes are escaped by doubling them. The
header contains the union of keys found across the matching documents. Object
values are serialized as JSON strings.

For example:

```csv
"@timestamp","level","message","service"
"2026-11-22T14:30:00.000Z","ERROR","Database connection failed","checkout"
```

When no documents match, the response body is an empty string.

## Errors

Elasticsearch or export conversion failures return `500 Internal Server Error`:

```json
{ "error": "Internal server error while exporting logs" }
```

The export is generated in memory. Large exports should be constrained with
specific time-range or service filters.
