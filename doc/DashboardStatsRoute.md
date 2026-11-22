# `GET /api/dashboard/stats`

## Purpose

Returns the aggregate metrics used by the monitoring dashboard. Elasticsearch
provides log counts and aggregations; MongoDB provides the number of imported file
records.

## Request

```http
GET http://localhost:3000/api/dashboard/stats
Accept: application/json
```

No query parameters or request body are accepted.

## Response

On success, the route returns `200 OK`:

```json
{
  "totalLogs": 1250,
  "logsToday": 84,
  "errorLogs": 37,
  "criticalLogs": 4,
  "errorCriticalLogs": 41,
  "importedFiles": 12,
  "hourlyEvolution": [
    {
      "hour": "2026-11-22T14:00:00.000Z",
      "count": 18
    }
  ],
  "levelDistribution": [
    {
      "level": "INFO",
      "count": 980
    },
    {
      "level": "ERROR",
      "count": 37
    }
  ]
}
```

`logsToday` covers the current UTC calendar day. `hourlyEvolution` covers the
previous 24 hours in one-hour buckets, including empty buckets. `errorCriticalLogs`
is the sum of `errorLogs` and `criticalLogs`.

## Errors

If an aggregation or database query fails, the route returns `500 Internal Server
Error`:

```json
{
  "error": "Internal server error while calculating dashboard statistics"
}
```

## Data sources

- Elasticsearch index pattern: `logs-ecom-*`
- MongoDB collection: the `File` model
