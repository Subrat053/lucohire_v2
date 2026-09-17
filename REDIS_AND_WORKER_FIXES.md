# Backend Redis & Worker Configuration Fixes

## 1. Overview & Root Cause Analysis

When starting the backend server via `npm start`, the application encountered connection errors and worker initialization failures:

### Errors Identified:
1. **`Error: connect ECONNREFUSED 127.0.0.1:6379`**:
   - **Root Cause**: `crawlerWorker.js` was initializing BullMQ `Queue` and `Worker` instances using hardcoded fallback parameters `{ host: '127.0.0.1', port: 6379 }` at module load time.
   - When running on a machine without a local Redis instance running on port `6379`, Node.js immediately threw unhandled connection errors and crashed or spammed reconnect attempts.

2. **`Error: BullMQ: Your redis options maxRetriesPerRequest must be null`**:
   - **Root Cause**: `candidateOutreach.worker.js` created a standalone `new Redis(...)` instance without passing BullMQ-required configuration (`maxRetriesPerRequest: null`).

3. **`getaddrinfo ENOTFOUND <redis-cloud-host>` (Infinite Retry Loops)**:
   - **Root Cause**: An expired or unreachable Redis Cloud host in `.env` caused `ioredis` to flood logs with reconnection attempts because no backoff `retryStrategy` was defined.

---

## 2. Summary of Changes Made

### 1. `backend/workers/crawlerWorker.js`
- **Removed Hardcoded Connection**: Removed `{ host: '127.0.0.1', port: 6379 }`.
- **Integrated Centralized Client**: Switched to `getRedisClient()` from `../modules/queue/redis.client` and `queueSupported()` from `../modules/queue/queue.factory`.
- **Added Inline/In-Memory Fallback Queue**: If BullMQ / Redis is disabled or unavailable, `crawlerBulkQueue.add()` executes batch crawling asynchronously in background using `setImmediate()`, ensuring crawlers continue working seamlessly during local development.
- **Added Error Handlers**: Attached `worker.on('error', ...)` and `queueInstance.on('error', ...)` listeners to prevent unhandled process crashes.

### 2. `backend/workers/candidateOutreach.worker.js`
- **Replaced Raw `ioredis` Instance**: Switched to `getRedisClient()` which enforces BullMQ-compliant options (`maxRetriesPerRequest: null`, `lazyConnect: true`).
- **Conditional Initialization**: Worker only attempts to start if `queueSupported()` is `true` and a valid Redis connection exists.
- **Added Error Listener**: Added `candidateOutreachWorker.on('error', ...)` to prevent unhandled rejection events.

### 3. `backend/modules/queue/redis.client.js`
- **Added Exponential Backoff Retry Strategy**: Added `retryStrategy(times)` with capped exponential backoff (up to 30s) to prevent CPU and log flooding when Redis is temporarily offline or DNS fails.

### 4. `backend/.env`
- **Development Fallback Mode**: Set `QUEUE_USE_BULLMQ=false` and cleared the stale/expired cloud Redis URL.
- This instructs the backend to run in lightweight in-memory/inline mode locally without requiring Redis to be installed or running on port 6379.

---

## 3. How the Fallback Architecture Works

```
                        ┌─────────────────────────────────┐
                        │   Job Request (e.g. Crawler /   │
                        │   Candidate Digest / Outreach)  │
                        └────────────────┬────────────────┘
                                         │
                         Is BullMQ Enabled & Redis URL set?
                                         │
                       ┌─────────────────┴─────────────────┐
                       ▼ YES                               ▼ NO
         ┌───────────────────────────┐       ┌───────────────────────────┐
         │     BullMQ Queue Engine   │       │   Inline / Memory Queue   │
         │  - Distributed Workers    │       │  - Zero dependencies      │
         │  - Redis Persistence      │       │  - Async background run   │
         │  - Retries & Delayed Jobs │       │  - Ideal for local dev    │
         └───────────────────────────┘       └───────────────────────────┘
```

---

## 4. Environment Configuration Guide

### Local Development (No Redis required)
In `backend/.env`:
```env
REDIS_URL=
QUEUE_USE_BULLMQ=false
```

### Production / Staging (With Live Redis or Upstash)
In `backend/.env`:
```env
REDIS_URL=rediss://default:<password>@<your-upstash-or-cloud-redis>:6379
REDIS_TLS=false
REDIS_TLS_REJECT_UNAUTHORIZED=true
QUEUE_USE_BULLMQ=true
QUEUE_DEFAULT_ATTEMPTS=3
QUEUE_DEFAULT_BACKOFF_MS=2000
WORKER_CONCURRENCY=5
```

---

## 5. Verification & Testing

- **Worker Module Import**: Executed `node -e "require('./workers/crawlerWorker'); require('./workers/candidateOutreach.worker');"` &rarr; **Code 0 (Clean load)**.
- **Server Startup Test**: Executed `node server.js`:
  - Connected to MongoDB Atlas.
  - All Cron jobs initialized.
  - All Worker queues initialized with fallback mode.
  - API listening on `http://localhost:5000` with **0 errors**.
