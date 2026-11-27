# `GET /health`

## Purpose

Reports whether MongoDB, Redis, and Elasticsearch are reachable. The route is
implemented in `src/server.js` and is available after the application connects to
MongoDB and initializes Better Auth.

## Request

```http
GET http://localhost:3000/health
Accept: application/json
```

No request body or authentication header is required by the current implementation.

## Successful response

When every dependency responds within three seconds, the route returns `200 OK`:

```json
{
  "status": "OK",
  "timestamp": "2026-11-22T14:30:00.000Z",
  "services": {
    "mongodb": "UP",
    "redis": "UP",
    "elasticsearch": "UP"
  }
}
```

`timestamp` is an ISO-8601 UTC timestamp. Each service check has an independent
three-second timeout.

## Degraded response

If any dependency is unavailable or times out, the route returns `503 Service
Unavailable`:

```json
{
  "status": "DEGRADED",
  "timestamp": "2026-11-22T14:30:00.000Z",
  "services": {
    "mongodb": "UP",
    "redis": "DOWN",
    "elasticsearch": "UP"
  }
}
```

The route does not expose dependency error details; inspect backend logs and service
health endpoints for diagnostics.

## Operational use

Use this endpoint for a load-balancer health probe or a local readiness check. A
`200` response means all three dependencies passed their checks at that moment; it
does not validate application data or Elasticsearch index contents.
