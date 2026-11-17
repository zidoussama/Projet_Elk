# Projet ELK — Application and Monitoring Documentation

**Project:** `Projet_Elk`  
**Document scope:** `app/`, `docker/`, and the existing ELK pipeline  
**Document status:** Current-state technical documentation  
**Last reviewed:** 13 November 2026

---

## 1. Executive summary

This repository is the foundation of an e-commerce monitoring solution built around the
Elastic Stack. The completed work currently has two distinct layers:

1. **An operational ELK pipeline** that generates, parses, normalizes, and indexes
   e-commerce log events from CSV and JSON Lines files.
2. **A JavaScript monitoring-backend scaffold** prepared for future application
   development, with dependencies selected for HTTP APIs, authentication, persistence,
   queues, real-time events, and Elasticsearch integration.

The ELK layer is the most complete part of the project and has been validated with a
CSV dataset containing 250 valid events. The backend is intentionally documented as a
scaffold: its package configuration, environment contract, linting configuration, and
unit-test foundation, HTTP entrypoint, and health route exist, but no database model,
business route, or frontend has yet been implemented.

This distinction is important for onboarding and deployment. The repository can be used
today to run the local log-ingestion demonstration and start the backend health service.
It cannot yet be used as a complete monitoring API without implementing its application
modules and business routes.

## 2. Current implementation status

| Area | Status | Evidence |
|---|---|---|
| CSV log ingestion | Implemented and validated | `docker/elk/logstash/pipeline/csv.conf` |
| JSON Lines ingestion | Configured | `docker/elk/logstash/pipeline/json.conf` |
| Shared Elasticsearch mapping | Implemented | `docker/elk/elasticsearch/index-template.json` |
| Dead-letter handling | Configured | Logstash pipeline configurations |
| Mock log generation | Implemented | `docker/elk/scripts/generate_mock_logs.py` |
| Elasticsearch, Logstash, Kibana orchestration | Implemented for local development | `docker/elk/docker-compose.yml` |
| MongoDB local service | Available as a separate service | `docker/mongodb/docker-compose.yml` |
| Redis local service | Available as a separate service | `docker/redis/docker-compose.yml` |
| Backend dependency and script setup | Implemented | `app/monitoring-backend/package.json` |
| Backend utility example and tests | Implemented | `app/monitoring-backend/src/utils/` |
| Backend HTTP entrypoint and health endpoint | Implemented | `app/monitoring-backend/src/server.js` |
| Frontend | Not present | No frontend module exists under `app/` |

## 3. Repository structure

```text
Projet_elk/
├── app/
│   └── monitoring-backend/
│       ├── .env.example
│       ├── .gitignore
│       ├── eslint.config.mjs
│       ├── package.json
│       ├── package-lock.json
│       ├── src/
│       │   └── utils/
│       │       ├── math.js
│       │       └── math.test.js
│       └── vitest.config.js
├── docker/
│   ├── elk/
│   │   ├── docker-compose.yml
│   │   ├── elasticsearch/index-template.json
│   │   ├── logstash/config/pipelines.yml
│   │   ├── logstash/pipeline/csv.conf
│   │   ├── logstash/pipeline/json.conf
│   │   ├── logs/
│   │   └── scripts/generate_mock_logs.py
│   ├── mongodb/docker-compose.yml
│   └── redis/docker-compose.yml
├── doc/
│   ├── ApplicationDocumentation.md
│   └── PiplineDoc.md
└── Readme
```

Generated directories such as `node_modules/`, build output, coverage output, and local
`.env` files are excluded from source control by the backend ignore rules.

## 4. Architecture

### 4.1 Implemented data path

```text
generate_mock_logs.py
        |
        v
CSV / JSONL files mounted into Logstash
        |
        +-----------------------+
        |                       |
        v                       v
csv-logs pipeline        json-logs pipeline
        |                       |
        +-----------+-----------+
                    v
          Parse and normalize events
          - dates and numeric values
          - level and tags
          - geographic coordinates
          - source metadata
          - stable document identifiers
                    |
          +---------+----------+
          |                    |
          v                    v
    logs-ecom-*         logs-dead-letter
    valid events        rejected events
          |
          v
       Kibana
```

The two Logstash pipelines intentionally produce a common event schema. This allows
events to be queried and aggregated consistently regardless of whether the source was
CSV or JSON Lines.

### 4.2 Planned application path

The backend manifest indicates the intended application direction:

```text
Client / dashboard
        |
        v
Express API
  |      |       |        |
  v      v       v        v
MongoDB Redis  BullMQ  Elasticsearch
                 |
                 v
             background jobs
        |
        v
     Socket.IO real-time updates
```

This is a target architecture inferred from the declared dependencies, not an
implemented runtime architecture. The repository currently contains no route layer,
service layer, model layer, worker, Socket.IO server, or authentication flow.

## 5. ELK implementation

### 5.1 Docker services

The ELK composition defines three services:

| Service | Image | Responsibility | Local port |
|---|---|---|---:|
| Elasticsearch | `docker.elastic.co/elasticsearch/elasticsearch:9.1.4` | Storage, search, and aggregations | `9200` |
| Logstash | `docker.elastic.co/logstash/logstash:9.1.4` | File input, transformation, and indexing | Internal |
| Kibana | `docker.elastic.co/kibana/kibana:9.1.4` | Search and visualization interface | `5601` |

Elasticsearch runs as a single node. `esdata` persists Elasticsearch data and `lsdata`
persists Logstash state, including file-position markers. Health checks ensure that
Logstash and Kibana start only after Elasticsearch is healthy.

### 5.2 Input formats

The pipeline accepts:

- `logs.csv` for comma-separated events with a header row;
- `logs.jsonl` for one JSON object per line;
- `malformed_logs.jsonl` for deliberately invalid records used to verify rejection
  behavior.

The generator creates equivalent CSV and JSON Lines data so that both ingestion paths
can be compared.

### 5.3 Normalization and enrichment

The pipelines normalize the following values:

- event date into Elasticsearch `@timestamp`;
- quantities into integers;
- amounts into numeric values;
- log levels into a consistent vocabulary;
- pipe-delimited tags into arrays;
- latitude and longitude into a `geo_point`;
- source filename and source format into traceability fields;
- a stable Elasticsearch document identifier based on source format and event ID.

The stable identifier makes replays safer and keeps equivalent events from different
source formats distinguishable.

### 5.4 Elasticsearch index model

The `logs-ecom-template` template applies to `logs-ecom-*` indices. Important field
categories are:

| Category | Fields |
|---|---|
| Time | `@timestamp` |
| Exact identifiers | `event_id`, `user_id`, `session_id`, `order_id`, `product_id` |
| Filtering and aggregation | `level`, `service`, `environment`, `event_type`, `status`, `currency` |
| Numeric metrics | `quantity`, `amount` |
| Network and geography | `ip`, `location` |
| Traceability | `source_file`, `source_format`, `upload_id` |
| Searchable content | `message`, `tags` |

The template uses one shard and zero replicas for local development. Production
settings must define replicas, retention, lifecycle management, backups, and security.

## 6. Backend scaffold

### 6.1 Package and runtime

The backend package is named `monitoring-backend` and uses CommonJS package semantics.
The entrypoint is `src/server.js`. It creates an Express application, enables CORS and
JSON request parsing, exposes `GET /health`, returns JSON 404 responses, and provides a
central error handler. `startServer()` also registers graceful shutdown handlers for
`SIGINT` and `SIGTERM`.
The declared runtime scripts are:

| Script | Purpose | Current state |
|---|---|---|
| `npm run dev` | Watch `src/server.js` with Node | Available |
| `npm start` | Run `src/server.js` | Available |
| `npm run lint` | Run ESLint | Available |
| `npm test` | Run Vitest once | Passing |
| `npm run test:watch` | Run Vitest interactively | Available |
| `npm run test:coverage` | Run tests with V8 coverage | Available |

### 6.2 Declared dependency responsibilities

The dependencies establish the intended technical foundation:

- **Express:** HTTP server and API routing;
- **Mongoose:** MongoDB access and schema modeling;
- **`@elastic/elasticsearch`:** Elasticsearch queries and indexing;
- **ioredis and BullMQ:** Redis-backed queues and background jobs;
- **Socket.IO:** real-time client notifications;
- **jsonwebtoken and bcrypt:** authentication tokens and password hashing;
- **class-validator and class-transformer:** request validation and transformation;
- **cors and dotenv:** cross-origin configuration and environment loading.

Installing a dependency does not mean that its functionality is currently wired into
the application. Each integration still requires configuration, error handling,
tests, and runtime health checks.

### 6.3 Environment contract

The example environment file defines the following variables:

| Variable | Purpose | Example |
|---|---|---|
| `NODE_ENV` | Runtime environment | `development` |
| `PORT` | Backend HTTP port | `3000` |
| `MONGO_URI` | MongoDB connection string | Local or managed URI |
| `REDIS_HOST` | Redis hostname | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |
| `ELASTICSEARCH_NODE` | Elasticsearch URL | `http://localhost:9200` |
| `JWT_SECRET` | Token-signing secret | Generate a private random value |
| `JWT_EXPIRES_IN` | Token lifetime | `15m` |

Create a local `.env` from `.env.example` and fill in real values. Never commit the
local `.env`, passwords, JWT secrets, or production connection strings.

## 7. Local setup

### 7.1 Prerequisites

- Docker Desktop with Docker Compose;
- Node.js with built-in watch mode support;
- npm;
- Python 3 for mock-log generation;
- at least 2 GB of free memory for the local Elasticsearch and Logstash JVMs.

### 7.2 Start the ELK pipeline

From `docker/elk`:

```powershell
docker compose up -d
docker compose ps
```

Generate or regenerate test input:

```powershell
python scripts\generate_mock_logs.py --count 250 --out-dir logs --seed 42
```

Check Elasticsearch:

```powershell
curl http://localhost:9200
curl http://localhost:9200/_cluster/health
curl http://localhost:9200/_cat/indices?v
```

Open Kibana at `http://localhost:5601`. Create a data view matching
`logs-ecom-*`, using `@timestamp` as the time field when prompted.

Stop the stack without deleting persistent volumes:

```powershell
docker compose down
```

To remove local Elasticsearch and Logstash data as well, use the explicit project
volumes command only after confirming that the data is disposable:

```powershell
docker compose down -v
```

### 7.3 Start MongoDB and Redis

These services are separate from the ELK composition:

```powershell
cd ..\mongodb
docker compose up -d

cd ..\redis
docker compose up -d
```

The MongoDB compose file uses development credentials (`admin` / `admin123`) and must
not be reused in a shared or production environment.

### 7.4 Install and test the backend

From `app/monitoring-backend`:

```powershell
npm ci
npm test
npm run lint
```

The current unit-test command completes successfully with one test file and two tests.
The backend runs directly from JavaScript source and does not require build output.
The health endpoint can be checked after starting the service:

```powershell
npm start
curl http://localhost:3000/health
```

The response contains the service name, an `ok` status, and an ISO timestamp.

## 8. Testing and verification

### 8.1 Existing automated verification

The current Vitest suite validates the example `add` utility:

- positive addition;
- addition involving a negative number.

This is a tooling smoke test, not application-level coverage.

### 8.2 Recommended verification layers

When backend implementation begins, add tests in this order:

1. unit tests for validators, services, parsers, and pure transformations;
2. API tests for health, authentication, ingestion, and error responses;
3. integration tests for MongoDB, Redis, Elasticsearch, and BullMQ;
4. pipeline tests for valid, malformed, duplicate, and replayed log files;
5. end-to-end tests for the monitoring workflows exposed to users.

Every ingestion test should assert both the successful index and the dead-letter result
for rejected records.

## 9. Security and operational constraints

The current local stack disables Elasticsearch security and exposes MongoDB with
development credentials. This is acceptable only for isolated local development.

Before any shared or production deployment:

- enable Elasticsearch authentication and TLS;
- replace development credentials and rotate all secrets;
- use a secret manager rather than committed environment files;
- restrict network exposure and container privileges;
- configure MongoDB authentication and least-privilege users;
- protect Redis and enable encrypted transport where required;
- add request validation, rate limiting, structured logging, and audit events;
- define index retention, snapshots, replicas, and recovery procedures;
- add health, readiness, and dependency checks to the backend.

## 10. Known gaps

The following items are intentionally recorded so future work does not mistake declared
configuration for completed behavior:

1. Implement MongoDB models and connection lifecycle management.
2. Implement Elasticsearch client initialization and query services.
3. Implement Redis/BullMQ workers and retry/dead-letter policies.
4. Implement JWT authentication, password handling, and authorization rules.
5. Add Socket.IO event contracts and connection authorization.
6. Add API documentation, request schemas, and integration tests.
7. Add a frontend or dashboard client if a user-facing monitoring interface is required.
8. Add CI validation for linting, tests, type-checking, and container configuration.
9. Move production security, retention, and observability settings into deployment
    configuration.

## 11. Recommended delivery sequence

### Phase 1 — Make the backend executable

- add a `/ready` endpoint backed by dependency checks;
- add graceful shutdown for external clients as they are introduced;
- add structured request and startup logging.

### Phase 2 — Connect the data services

- configure MongoDB, Redis, and Elasticsearch clients;
- add startup checks with explicit failure messages;
- define the first domain models and repository interfaces;
- add integration tests using isolated development services.

### Phase 3 — Expose monitoring capabilities

- add authenticated endpoints for event search and aggregates;
- add pagination, filters, and time-range validation;
- add background ingestion jobs and retry handling;
- publish real-time status updates through Socket.IO.

### Phase 4 — Production readiness

- add CI/CD and containerization for the backend;
- enable security and TLS;
- define dashboards and alerts in Kibana;
- establish retention, backups, incident response, and operational runbooks.

## 12. Source references

- [Backend package manifest](../app/monitoring-backend/package.json)
- [Backend environment template](../app/monitoring-backend/.env.example)
- [Backend ESLint configuration](../app/monitoring-backend/eslint.config.mjs)
- [Backend test configuration](../app/monitoring-backend/vitest.config.js)
- [Backend utility test](../app/monitoring-backend/src/utils/math.test.js)
- [ELK composition](../docker/elk/docker-compose.yml)
- [Elasticsearch index template](../docker/elk/elasticsearch/index-template.json)
- [Logstash pipeline registry](../docker/elk/logstash/config/pipelines.yml)
- [CSV pipeline](../docker/elk/logstash/pipeline/csv.conf)
- [JSON Lines pipeline](../docker/elk/logstash/pipeline/json.conf)
- [Mock-log generator](../docker/elk/scripts/generate_mock_logs.py)
- [Pipeline realization report](./PiplineDoc.md)
