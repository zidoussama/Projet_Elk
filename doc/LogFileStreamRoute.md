# `GET /api/logs/stream`

## Purpose

Streams the current uploaded-file status list using Server-Sent Events (SSE).
This is intended for a monitoring screen that needs updates without repeatedly
issuing ordinary HTTP requests.

## Request

```http
GET http://localhost:3000/api/logs/stream
Accept: text/event-stream
```

The connection remains open until the client closes it. No request body or query
parameters are required.

## Response headers

The server sends:

```http
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

## Event format

An initial event is sent immediately, followed by an event every three seconds:

```text
data: {"count":1,"files":[{"_id":"64f000000000000000000001","filename":"logs.csv","status":"indexed"}]}

```

Each `data` payload is JSON with the same shape as
[List log files](LogFilesRoute.md). Binary file content is excluded. The route
reconciles Logstash uploads before each event.

If a reconciliation or database operation fails, the server sends a named event:

```text
event: error
data: {"error":"Elasticsearch unavailable"}

```

The connection remains open after an error and retries on the next three-second
interval. When the client disconnects, the server clears the update timer.

## Client example

```js
const source = new EventSource("http://localhost:3000/api/logs/stream");

source.onmessage = event => {
  const payload = JSON.parse(event.data);
  renderFiles(payload.files);
};

source.addEventListener("error", event => {
  console.error("File status stream error", event);
});
```
