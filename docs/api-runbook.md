# API runbook

Commands and behaviour that are not obvious from the code. Requirement ids refer to [PRD.md](PRD.md).

## Run

```bash
npm run db:up            # MySQL + Redis (docker compose)
npm run db:migrate       # schema
npm run seed             # admin + demo data (see below)
npx nx serve api         # http://localhost:3000/api, Swagger UI at /api/docs
npx nx e2e api-e2e       # builds, starts the API, runs the HTTP tests, stops it
```

## Seed (FR-SEED-\*)

| Command              | Effect                                                                                                     |
| -------------------- | ---------------------------------------------------------------------------------------------------------- |
| `npm run seed:admin` | Creates or resets the admin account (FR-AUTH-4). Override with `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`. |
| `npm run seed`       | `seed:admin`, then **wipes and re-creates** the demo data, then enqueues the PENDING rows.                 |

`npm run seed` is re-runnable. It deletes **all** customers with their applications and status events (the admin
is kept and reset), then inserts 501 customers, 10,000 applications and the status events in batches of 1,000
rows, inside one transaction. It refuses to run when `NODE_ENV=production`. Faker is seeded, so names, NRICs and
amounts are the same on every run; UUIDs and the PENDING due times are not.

Dev credentials (documented, never for production):

| Role                                               | Email                                                           | Password                |
| -------------------------------------------------- | --------------------------------------------------------------- | ----------------------- |
| Admin                                              | `admin@loanportal.test`                                         | `Admin#Passw0rd2026`    |
| Customer (has 5 PENDING + 12 decided applications) | `customer@loanportal.test`                                      | `Customer#Passw0rd2026` |
| 500 synthetic customers                            | `customer001@loanportal.test` ... `customer500@loanportal.test` | `Customer#Passw0rd2026` |

All seeded customers share one argon2id hash, computed once. About 20 applications are PENDING with due times
10 s to 5 min after the seed ran; the credit-check worker decides them while the API is running.

## Credit check (FR-CC-\*)

- The `loan_applications` row is the source of truth. Submit writes the row and a `null -> PENDING` event in one
  transaction, then adds a BullMQ delayed job (`jobId` = application id, queue `credit-check`).
- The worker runs `UPDATE ... SET status, decided_at = NOW(3) WHERE id = ? AND status = 'PENDING'`. Only if one
  row changed does it write the SYSTEM status event and publish the change. A retry or a second worker matches
  zero rows and does nothing.
- On every boot the API scans PENDING rows and adds any missing job (and retries failed ones), so a restart, a
  flushed Redis, or rows inserted by the seed script are still decided.
- Every minute the API also sweeps PENDING rows that are more than a minute past their due time and adds any missing
  job (or retries a failed one). Job ids are application ids, so a sweep never creates a duplicate, and several API
  instances can sweep at once.
- If Redis is down at submit time the application is still created (201): the enqueue gives up after 2 s instead of
  waiting on the Redis client's reconnect loop. The row stays PENDING and the first sweep after Redis is back
  schedules it, with no restart.

## Real time (FR-RT-\*)

`GET /api/applications/events` is server-sent events. Decisions are published on the Redis channel
`application-status-changed`; every API instance subscribes and forwards to its own connected clients, filtered by
owner (admins receive all). The payload is `{ applicationId, status, decidedAt }`. A named `heartbeat` event is sent
every 25 s; `EventSource.onmessage` ignores it.

## Tests

- `npx nx test api`: unit tests. The Nest packages that ship ESM only (`@nestjs/jwt`, `@nestjs/typeorm`,
  `@nestjs/bullmq`, ...) are compiled for Jest through `transformIgnorePatterns` in `apps/api/jest.config.cts`.
- `npx nx e2e api-e2e`: needs the seeded admin. It registers users under `@example.test` and deletes them (with
  their applications) in its global teardown. The teardown also stops whatever listens on `PORT` (default 3000). Registration and login are throttled to 5 requests per minute
  per IP (FR-AUTH-6) and the suite uses 5 registrations and 2 logins, so wait a minute between consecutive runs.

## Swagger

Request schemas are generated from the shared DTO classes by the official `@nestjs/swagger/plugin` TypeScript
transformer, configured in `apps/api/webpack.config.js`, so `libs/shared` carries no `@nestjs/swagger` import.
The shared response types are plain interfaces, which the plugin cannot read; their schemas are written once in
`apps/api/src/openapi/response-schemas.ts`.
