# `GET /api/logs/search`

## Purpose

Searches indexed log events in Elasticsearch with optional text, level, service,
time-range, sort, and page filters.

## Request

```http
GET http://localhost:3000/api/logs/search?text=database&level=error&page=1&sort=desc
Accept: application/json
```

### Query parameters

| Parameter | Type | Description |
|---|---|---|
| `text` | string | Fuzzy multi-field search over `message`, `event_type`, `service`, `level`, and `event_id` |
| `q` | string | Alias for `text` |
| `level` | string | Exact log level; normalized to uppercase |
| `service` | string | Exact service filter |
| `from` | ISO date-time | Inclusive lower bound for `@timestamp` |
| `start` | ISO date-time | Alias for `from` |
| `to` | ISO date-time | Inclusive upper bound for `@timestamp` |
| `end` | ISO date-time | Alias for `to` |
| `page` | positive integer | One-based page number; defaults to `1` |
| `sort` | `asc` or `desc` | Sort by `@timestamp`; defaults to `desc` |

Each page contains at most 50 results. Invalid or missing `page` values fall back
to page 1; any sort value other than `asc` is treated as `desc`.

## Response

The route returns `200 OK`:

```json
{
  "page": 1,
  "size": 50,
  "total": 1,
  "results": [
    {
      "id": "abc123",
      "index": "logs-ecom-2026.11.22",
      "score": 1.2,
      "@timestamp": "2026-11-22T14:30:00.000Z",
      "level": "ERROR",
      "service": "checkout",
      "message": "Database connection failed"
    }
  ]
}
```

`results` combines the Elasticsearch hit metadata (`id`, `index`, `score`) with
the indexed document fields.

## Errors

Elasticsearch or query failures return `500 Internal Server Error`:

```json
{ "error": "Internal server error while searching logs" }
```

The search index pattern is `logs-ecom-*`.
