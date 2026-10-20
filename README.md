# Loan Application Portal

A personal-loan portal built as an Nx monorepo. Customers register, apply for a loan and watch the outcome
arrive live; admins browse and filter every application. A NestJS API (TypeORM, MySQL, Redis, BullMQ) serves a
React single-page app, and both validate with the same class-validator DTOs from a shared library. The credit
check is simulated: each application is decided at a random moment 10 seconds to 5 minutes after submission,
by a durable background job that survives restarts.

Requirements and decisions: [PRD](docs/PRD.md) (ids such as `FR-CC-5` are referenced from commits and tests) -
[database schema](docs/database-schema.md) - [API runbook](docs/api-runbook.md).

## Prerequisites

- Node.js 24 and npm
- Docker (MySQL 9.7 and Redis run through `docker compose`)

## Quick start

```bash
cp .env.example .env      # then change the passwords; JWT_SECRET needs 32+ characters
npm ci
npm run db:up             # MySQL + Redis, waits until healthy
npm run db:migrate
npm run seed              # admin, 501 customers, 10,000 applications
npm run dev               # API and web together
```

| What                                                | URL                            |
| --------------------------------------------------- | ------------------------------ |
| Web app                                             | http://localhost:4200          |
| API                                                 | http://localhost:3000/api      |
| Swagger UI (not mounted when `NODE_ENV=production`) | http://localhost:3000/api/docs |

The web dev server proxies `/api` to the API, so the browser sees one origin.

### Test accounts (development only, created by `npm run seed`)

| Role                                           | Email                                                           | Password                |
| ---------------------------------------------- | --------------------------------------------------------------- | ----------------------- |
| Admin                                          | `admin@loanportal.test`                                         | `Admin#Passw0rd2026`    |
| Customer (5 PENDING + 12 decided applications) | `customer@loanportal.test`                                      | `Customer#Passw0rd2026` |
| 500 more customers                             | `customer001@loanportal.test` ... `customer500@loanportal.test` | `Customer#Passw0rd2026` |

All names, NRICs and phone numbers are synthetic. About 20 seeded applications are PENDING and get decided
within 5 minutes of seeding while the API runs. `npm run seed` deletes all customers and their applications
before re-creating them, and refuses to run with `NODE_ENV=production`.

## Scripts

| Command                                   | Purpose                                                                |
| ----------------------------------------- | ---------------------------------------------------------------------- |
| `npm run dev`                             | Serve API and web                                                      |
| `npm run check`                           | Lint, typecheck, test and build every project (the definition of done) |
| `npm run db:up` / `db:down`               | Start / stop MySQL and Redis                                           |
| `npm run db:migrate`                      | Apply TypeORM migrations                                               |
| `npm run db:migrate:revert`               | Revert the last migration                                              |
| `npm run db:migration:show`               | List applied and pending migrations                                    |
| `npm run db:migration:generate -- <Name>` | Generate a migration from entity changes                               |
| `npm run seed`                            | Wipe and re-create demo data (see above)                               |
| `npm run seed:admin`                      | Create or reset only the admin account                                 |
| `npx nx test <project>`                   | Unit tests for `api`, `web` or `shared`                                |
| `npx nx e2e api-e2e`                      | Build, start the API, run the HTTP tests, stop it                      |

## Architecture

```
apps/
  api/        NestJS: auth, users, loan-purposes, applications, credit-check, realtime, health
  api-e2e/    Jest + axios tests against a running API
  web/        React + Vite + TanStack Query + react-hook-form + Tailwind/shadcn (bulletproof-react layout)
libs/
  shared/     DTO classes, enums, interfaces, validators. Ships to the browser: no TypeORM, no @nestjs/*
docs/         PRD, database schema, API runbook
```

**Request flow.** The browser calls `/api/...` on its own origin. A global guard reads the `access_token` cookie
and verifies the JWT; a roles guard checks `CUSTOMER` / `ADMIN`; a strict `ValidationPipe` (whitelist,
forbid unknown fields) validates against the shared DTOs; every error leaves as `{ statusCode, message, errors? }`.
The web app validates with the same DTOs through `classValidatorResolver`, the API stays authoritative.

**Credit-check flow.**

1. `POST /applications` writes the application (`PENDING`, with a random `credit_check_due_at`) and a
   `null -> PENDING` audit event in one transaction, then adds a BullMQ delayed job (`jobId` = application id).
2. When the job fires, the worker runs `UPDATE ... SET status, decided_at WHERE id = ? AND status = 'PENDING'`.
   Only if exactly one row changed does it write the `SYSTEM` audit event and publish the change. A retry or a
   second worker matches zero rows, so a decision can never be made twice.
3. The change is published on a Redis pub/sub channel. Every API instance forwards it over
   `GET /applications/events` (server-sent events), filtered by owner (admins see all).
4. The web app receives the event and invalidates the relevant React Query caches, so lists and the detail
   page refresh themselves. If the stream drops, `EventSource` reconnects and the client refetches.

**Restart safety.** The database row is the source of truth. On every boot the API scans `PENDING` rows and
adds any missing job, and retries failed ones, so a restart or a flushed Redis does not strand an application.

## Design decisions and trade-offs

| Decision                                                                                        | Why                                                                                                                                                                 | Trade-off                                                                                                            |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| TypeORM, schema only through migrations (`synchronize: false`)                                  | Reviewable, repeatable schema history                                                                                                                               | Entities are registered per feature module because webpack bundles the app                                           |
| Money as `DECIMAL(12,2)`, strings on the wire                                                   | No float error; range checks compare integer sen                                                                                                                    | Clients format amounts themselves                                                                                    |
| Loan limits RM1,000 - RM150,000, 12 - 84 months                                                 | Cap and 7-year tenure follow [RHB Personal Financing](https://www.rhbgroup.com/personal/loans/personal-financing/index.html); the RM1,000 minimum is our assumption | Changing a limit needs a new migration (CHECK constraints)                                                           |
| One set of class-validator DTOs in `libs/shared`                                                | The same rules in browser and API (FR-APP-2)                                                                                                                        | The lib must stay browser-safe; OpenAPI schemas come from the official swagger compiler plugin instead of decorators |
| UUID primary keys, generated by the app                                                         | No sequential ids to enumerate                                                                                                                                      | Random keys fragment InnoDB indexes; irrelevant at this scale                                                        |
| JWT in an `httpOnly`, `SameSite=Strict` cookie, same origin via the dev proxy                   | The token is out of reach of page scripts, and SSE can authenticate                                                                                                 | No CSRF token (not needed same-origin); no refresh tokens or revocation, so users re-login after an hour             |
| argon2id, OWASP minimum parameters (19 MiB, t=2, p=1)                                           | Current password-storage guidance, no 72-byte limit                                                                                                                 | Login costs tens of ms of CPU; unknown emails verify against a dummy hash so timing stays similar                    |
| Loan purposes: 2 s upstream call, in-memory cache (24 h), single-flight, warm-up at boot        | First user never pays the 2 s; 20 concurrent cold calls make one upstream call (unit-tested)                                                                        | The cache is per instance; multiple instances would use a Redis store                                                |
| BullMQ delayed jobs + Redis (not a DB poller)                                                   | Retries and backoff built in, exact timing, Redis already serves pub/sub                                                                                            | One more service to run; DB reconciliation (boot + every minute) covers Redis loss                                   |
| SSE (not WebSockets or polling)                                                                 | One-way, native `EventSource`, cookie auth, auto-reconnect                                                                                                          | Needs Redis pub/sub to work across instances                                                                         |
| Offset pagination, `created_at DESC, id DESC`, indexed per query                                | Simple, fine for 10k rows                                                                                                                                           | Deep pages get slower; cursor pagination for very large tables                                                       |
| NRIC masked in lists (`******-**-1234`), never logged; phone, income and passwords never logged | NFR-PRIV-1                                                                                                                                                          | NRIC is stored in clear text (see "With more time")                                                                  |
| `Idempotency-Key` on submit, unique per user                                                    | A double click or retry returns the original (200), including under concurrent requests                                                                             | Keys are not expired                                                                                                 |
| `application_status_events` audit table                                                         | Append-only trail of who changed what, when                                                                                                                         | One extra insert per status change                                                                                   |
| CHECK constraints for loan amount, tenure, income, `decided_at`                                 | The database refuses bad data even if the API has a bug                                                                                                             | Limits live in both `LOAN_LIMITS` and a migration                                                                    |
| Another customer's application returns 404, not 403                                             | Does not confirm that an id exists                                                                                                                                  | -                                                                                                                    |
| Rate limiting: 5 requests/min/IP on register and login, 120/min elsewhere                       | FR-AUTH-6                                                                                                                                                           | In-memory counters, per instance                                                                                     |

## Testing

Counts are from the last run of `npx nx test <project>` on this branch.

- Unit: `api` 45 tests (auth, loan-purposes single-flight and cache, submit and idempotency, ownership,
  credit-check idempotency, realtime filtering, seed data, health), `shared` 58 (NRIC, money, phone, DTOs),
  `web` 33 (validation, auth guard, SSE, API client, admin table).
- End to end: `apps/api-e2e` has 19 HTTP tests against a running API and the real database: register, cookie
  flags, login failure, roles, submit, validation error shape, idempotency (including a concurrent race), own
  list, 404 for another customer's application, admin list with status filter, event-stream headers, health.
  Run it with `npx nx e2e api-e2e` after `npm run seed:admin`. Registration and login are rate limited, so wait a
  minute between runs. It deletes the users it created when it finishes.
- Browser (Playwright) tests are not included.

## With more time

- Refresh-token rotation with server-side revocation, MFA, password reset
- Encrypt NRIC at rest and search it through a blind index
- Cursor pagination for very large tables
- Redis-backed purposes cache and rate-limit counters for multi-instance deployments
- Admin actions with maker-checker approval
- A CSRF token if the web app is ever served from a different origin than the API
- Observability: structured logs, metrics, tracing; an alert when overdue PENDING rows pile up
- CI pipeline with dependency scanning and an SBOM
- Playwright end-to-end tests and an accessibility audit
