# PRD — Personal Loan Application Portal


|             |                                                              |
| ----------- | ------------------------------------------------------------ |
| Status      | **DRAFT** — pending developer review                         |
| Source      | `Fullstack_Assessment.pdf` (Full-Stack Developer Assessment) — kept locally, not committed |
| Owner       | Ali                                                          |
| Time budget | 4–6 h build time, clock starts after this PRD is approved    |


Requirement IDs (`FR-*`, `NFR-*`) are referenced from commits, tests and the README.
Items marked **[ASSUMPTION]** are judgment calls not specified by the brief; they will be
listed in the README. Items marked **[OPEN]** need a decision before the relevant step.

---



## 1. Overview

A web portal where customers apply for personal loans and track their application status,
and admins review all applications. Built as an Nx monorepo: NestJS API, React web app,
MySQL database.

### 1.1 Goals

- Meet every functional requirement in the brief with clear structure and defensible decisions.
- Demonstrate production-minded handling of the brief's hidden problems: slow upstream
dependency, long-running background work, real-time updates, data volume, access control.
- Leave an honest, reviewable trail: commit history and `AI_USAGE.md`.



### 1.2 Non-goals

- Real credit scoring, real core-banking integration, payments/disbursement.
- Admin approve/reject actions (the credit check decides; admins only view).
- Email/SMS notifications, password reset, MFA, i18n (listed under "with more time").
- Production deployment / cloud infrastructure.

---



## 2. Roles


| Role         | How created                                | Can                                                                                       |
| ------------ | ------------------------------------------ | ----------------------------------------------------------------------------------------- |
| **Customer** | Self-registration                          | Submit applications; view **own** applications list + detail; receive live status updates |
| **Admin**    | Seed command only (never via registration) | View **all** applications list + detail; filter by status                                 |


---



## 3. Functional requirements

Priority: **M** = must (brief), **S** = should (best practice), **C** = could (if time).

### 3.1 Authentication — `FR-AUTH`


| ID        | Pri | Requirement                                        | Acceptance criteria                                                                                                                        |
| --------- | --- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| FR-AUTH-1 | M   | Customer can register with name, email, password   | Email unique (case-insensitive) → `409` on duplicate. Created role is always `CUSTOMER`; a `role` field in the payload is rejected (`400`) |
| FR-AUTH-2 | M   | User can log in / log out                          | Valid credentials → session established. Invalid → `401` with a generic message (no "email not found" vs "wrong password" distinction)     |
| FR-AUTH-3 | M   | Two roles: `CUSTOMER`, `ADMIN`                     | Role-guarded endpoints return `403` for the wrong role, `401` when unauthenticated                                                         |
| FR-AUTH-4 | M   | Admin account creation via seed/documented command | `nx run api:seed-admin` (or equivalent) creates/updates an admin from env vars; documented in README                                       |
| FR-AUTH-5 | S   | `GET /auth/me` returns current user                | Web app uses it to restore the session on reload                                                                                           |
| FR-AUTH-6 | S   | Login rate limiting                                | e.g. 5 attempts / min / IP → `429`                                                                                                         |


**[ASSUMPTION] Session mechanism:** JWT access token in an `httpOnly`, `Secure` (in prod),
`SameSite=Lax` cookie; no refresh token, expiry ~1 h. Trade-off: simpler than refresh-token
rotation, user re-logs in hourly. Cookie (not localStorage) keeps the token out of JS (XSS)
and lets SSE authenticate (`EventSource` cannot send headers).

**[ASSUMPTION] Password policy:** 12-128 characters, no composition rules (NIST SP 800-63B style).
Hashing: argon2id (decision D4, §7) following the OWASP Password Storage Cheat Sheet minimums
(m=19 MiB, t=2, p=1), which has no 72-byte input limit.


### 3.2 Loan application — `FR-APP`


| ID       | Pri | Requirement                                                         | Acceptance criteria                                                                                               |
| -------- | --- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| FR-APP-1 | M   | Logged-in customer submits an application with all fields in §3.2.1 | Valid → `201`, status `PENDING`, returned in response. Invalid → `400` with per-field messages                    |
| FR-APP-2 | M   | Same validation rules on frontend and backend                       | Rules live once in `libs/shared` (class-validator DTO); backend is the authority                                  |
| FR-APP-3 | M   | Loan purpose must be one of the backend-provided purposes           | Unknown purpose code → `400` (validated server-side against the cached list)                                      |
| FR-APP-4 | S   | Duplicate-submit protection                                         | Submit button disabled while pending; mutation is **never auto-retried**. **[OPEN]** `Idempotency-Key` header (C) |
| FR-APP-5 | S   | Email field pre-filled from the account                             | Editable — **[ASSUMPTION]** applicant contact email may differ from login email                                   |




#### 3.2.1 Field rules


| Field               | Rule                                     | Notes                                                                                                                                                                                              |
| ------------------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Full name           | Required, 2–100 chars, trimmed           |                                                                                                                                                                                                    |
| NRIC                | Required, Malaysian NRIC                 | Accept `YYMMDD-PB-####` or 12 digits; **stored normalised as 12 digits**; first 6 digits must be a real calendar date. Custom validator — `IsIdentityCard` in validator.js has no Malaysian locale |
| Phone               | Required, `IsMobilePhone('ms-MY')`       | Stored normalised (e.g. `+60…`) — **[OPEN]** normalisation format                                                                                                                                  |
| Email               | Required, valid email, ≤ 254 chars       | Stored lower-cased                                                                                                                                                                                 |
| Monthly income (RM) | Required, > 0, ≤ 10,000,000, max 2 dp    | **[ASSUMPTION]** bounds                                                                                                                                                                            |
| Loan amount (RM)    | Required, 1,000 – 150,000, max 2 dp      | Cap per [RHB Personal Financing](https://www.rhbgroup.com/personal/loans/personal-financing/index.html) ("up to RM150,000"); minimum is an **[ASSUMPTION]**. Display as `RM150,000.00`                                                                                                                                                    |
| Tenure (months)     | Required, integer, 12 – 84               | Max 7 years per the same RHB page; minimum is an **[ASSUMPTION]**                                                                                                                                                                                   |
| Loan purpose        | Required, code from `GET /loan-purposes` | Store code **and** a label snapshot (upstream labels may change)                                                                                                                                   |


Money is stored as `DECIMAL(12,2)`, never float. TypeORM/mysql2 returns DECIMAL as string —
conversion happens at the API boundary.

### 3.3 Loan purposes — `FR-LP`


| ID      | Pri | Requirement                                                            | Acceptance criteria                                                                                     |
| ------- | --- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| FR-LP-1 | M   | `GET /loan-purposes` returns the list                                  | Shape: `{ code, label }[]`                                                                              |
| FR-LP-2 | M   | Upstream fetch method contains a **2-second delay**                    | The delay lives inside the provider method (simulated core-banking client), not in the controller/cache |
| FR-LP-3 | M   | List is cached because it rarely changes                               | Warm-cache response < 50 ms (target). Server cache TTL **[ASSUMPTION]** 24 h                            |
| FR-LP-4 | S   | Cache warmed on application startup                                    | First user request does not pay the 2 s                                                                 |
| FR-LP-5 | S   | Concurrent cold-cache requests share one upstream call (single-flight) | 20 parallel requests on cold cache → exactly 1 upstream call (unit test)                                |
| FR-LP-6 | S   | Client-side cache                                                      | React Query `staleTime: Infinity` for this query                                                        |


Trade-off to document: in-memory cache is per-instance; multi-instance deployments would use
Redis (`cache-manager` store swap, no code change in callers).

### 3.4 Credit check — `FR-CC`


| ID      | Pri | Requirement                                                                         | Acceptance criteria                                                                                                 |
| ------- | --- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| FR-CC-1 | M   | New application status is `PENDING`                                                 |                                                                                                                     |
| FR-CC-2 | M   | Simulated credit check completes at a random time **10 s – 5 min** after submission | Due time chosen uniformly at submission and **persisted** (`credit_check_due_at`)                                   |
| FR-CC-3 | M   | Result is `APPROVED` or `REJECTED`                                                  | Terminal: a decided application never changes again                                                                 |
| FR-CC-4 | S   | Durable across API restarts                                                         | Restart the API with pending applications → they are still decided at/after their due time                          |
| FR-CC-5 | S   | Idempotent, race-safe decision                                                      | Decision written with `UPDATE … WHERE id = ? AND status = 'PENDING'`; running the worker twice cannot double-decide |
| FR-CC-6 | S   | Status change recorded with timestamp                                               | `decided_at` column; **[OPEN]** separate `application_status_events` audit table (C)                                |


**[OPEN] Scheduling mechanism** (decide before Step 7):

- **A — DB due-time + poller (recommended):** `@nestjs/schedule` job every ~2 s claims due
`PENDING` rows. No extra infra, restart-safe by design. Cost: ≤ 2 s latency, light DB polling.
- **B — BullMQ delayed jobs:** `@nestjs/bullmq` + Redis. Retries/backoff built in; Redis also
serves cache + pub/sub. Cost: extra infra, more to operate and explain.

**[OPEN] Decision rule:** pure random (e.g. 70 % approve), or simple affordability rule —
reject if estimated monthly instalment > 60 % of monthly income, otherwise random. The rule
version is more realistic and testable.

### 3.5 Real-time status — `FR-RT`


| ID      | Pri | Requirement                                            | Acceptance criteria                                               |
| ------- | --- | ------------------------------------------------------ | ----------------------------------------------------------------- |
| FR-RT-1 | M   | Customer sees the outcome without manually refreshing  | List and detail pages update within a few seconds of the decision |
| FR-RT-2 | S   | A user only receives events for their own applications | Verified by test / manual two-user check                          |
| FR-RT-3 | S   | Graceful degradation                                   | If the live channel drops, client reconnects and refetches        |


**[OPEN] Mechanism** (decide before Step 8):

- **SSE (recommended):** server→client only, native `EventSource`, cookie auth, auto-reconnect.
On event → React Query `invalidateQueries`. Multi-instance needs Redis pub/sub (documented).
- **Polling:** React Query `refetchInterval` while any visible application is `PENDING`.
- **WebSockets:** bidirectional, not needed here.



### 3.6 Viewing applications — `FR-VIEW`


| ID        | Pri | Requirement                           | Acceptance criteria                                                                          |
| --------- | --- | ------------------------------------- | -------------------------------------------------------------------------------------------- |
| FR-VIEW-1 | M   | Customer lists own applications       | Only own rows; newest first; paginated                                                       |
| FR-VIEW-2 | M   | Customer views own application detail | Another customer's id → `404` (not `403`, avoids confirming existence)                       |
| FR-VIEW-3 | M   | Admin lists all applications          | Paginated; shows applicant name, amount, purpose, status, submitted date                     |
| FR-VIEW-4 | M   | Admin filters by status               | `?status=PENDING                                                                             |
| FR-VIEW-5 | M   | Admin views any application detail    |                                                                                              |
| FR-VIEW-6 | S   | Server-side pagination                | `?page=&pageSize=` (pageSize ≤ 100, default 20); response `{ items, page, pageSize, total }` |
| FR-VIEW-7 | S   | NRIC masked in list views             | e.g. `******-**-1234`; full value only on detail                                             |


**[ASSUMPTION]** Offset pagination is sufficient at 10k rows; cursor pagination listed under
"with more time" for very large tables.

### 3.7 Seed data — `FR-SEED`


| ID        | Pri | Requirement                                          | Acceptance criteria                                                                                                                 |
| --------- | --- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| FR-SEED-1 | M   | Seed ≥ 10,000 applications across multiple customers | One command; idempotent or documented reset                                                                                         |
| FR-SEED-2 | M   | Test accounts documented                             | README lists customer + admin credentials (dev only)                                                                                |
| FR-SEED-3 | S   | Fast                                                 | Batched inserts (e.g. 1,000 rows/statement); password hashed once and reused for seed customers                                     |
| FR-SEED-4 | S   | Realistic mix                                        | ~500 customers; status mix mostly decided, a small number `PENDING` with near-future due times so the worker visibly processes them |
| FR-SEED-5 | S   | Synthetic data only                                  | Generated names/NRICs (`@faker-js/faker` or similar); valid NRIC format                                                             |


---



## 4. Non-functional requirements


| ID         | Area                                    | Requirement                                                                                                                       |
| ---------- | --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| NFR-SEC-1  | Validation                              | Global `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })`                                         |
| NFR-SEC-2  | Authz                                   | Ownership enforced in the query (`WHERE user_id = :me`), not only in the controller                                               |
| NFR-SEC-3  | Headers                                 | `helmet`; CORS restricted to the web origin (or same-origin via Vite proxy)                                                       |
| NFR-SEC-4  | Secrets                                 | No secrets in git; `.env.example` committed; config validated at boot (app refuses to start if invalid)                           |
| NFR-SEC-5  | Dependencies                            | Lockfile committed; official packages only; `npm audit` clean of high/critical at submission                                      |
| NFR-PRIV-1 | Personal data                           | NRIC, phone, income never written to logs; NRIC masked in lists; synthetic data only, never real PII (incl. in AI prompts)        |
| NFR-PERF-1 | DB                                      | Indexes: `(user_id, created_at)`, `(status, created_at)`, `(status, credit_check_due_at)`                                         |
| NFR-PERF-2 | Targets *(projections, to be measured)* | Admin list page p95 < 300 ms locally at 10k rows; warm `/loan-purposes` < 50 ms                                                   |
| NFR-REL-1  | Errors                                  | Consistent error shape `{ statusCode, message, errors? }`; no stack traces to clients                                             |
| NFR-TIME-1 | Time                                    | Store UTC; display in `Asia/Kuala_Lumpur`                                                                                         |
| NFR-DX-1   | Run                                     | `docker compose up -d` + documented `nx` commands run the whole stack from a clean clone                                          |
| NFR-QA-1   | Tests                                   | Unit: NRIC validator, credit-check decision/idempotency, loan-purpose single-flight, ownership. E2E (C): auth + submit happy path |


---



## 5. Architecture



### 5.1 Repository

```
apps/
  api/            NestJS — modules: auth, users, loan-purposes, applications, credit-check, (events)
  web/            React + Vite — bulletproof-react structure
libs/
  shared/         DTO classes (class-validator), enums, interfaces, custom validators
                  ⚠ no TypeORM, no @nestjs/* imports — this lib ships to the browser
docs/
  PRD.md
docker-compose.yml  README.md  AI_USAGE.md  CLAUDE.md
```



### 5.2 Frontend (bulletproof-react)

- `src/app` (routes, provider, router) → `src/features/*` → shared (`components`, `hooks`, `lib`, `utils`, `types`, `config`).
- Unidirectional imports enforced with ESLint `import/no-restricted-paths`; no cross-feature imports; no barrel files.
- Features: `auth`, `applications`, `loan-purposes`.
- API layer: one file per request in `features/<f>/api/` exporting fetcher + query options + hook; typed API client in `lib/api-client.ts` (no `as` casts on responses).
- React Query: query-key factories; global `QueryCache.onError` toast with `meta.skipGlobalErrorHandler` opt-out; queries retry network/5xx with backoff, never 4xx; **mutations never retry**.
- Forms: react-hook-form + `classValidatorResolver(SharedDto)`; numeric inputs via `valueAsNumber`.
- **[OPEN]** UI kit: Tailwind vs component library.



### 5.3 Data model

Full schema, indexes, constraints and the queries they serve: [database-schema.md](database-schema.md). Sketch:

**users** — `id` (uuid PK), `email` (unique), `password_hash`, `full_name`, `role` (enum), `created_at`, `updated_at`

**loan_applications** — `id` (uuid PK), `user_id` (FK), `full_name`, `nric` (char 12), `phone`,
`email`, `monthly_income` DECIMAL(12,2), `loan_amount` DECIMAL(12,2), `tenure_months` SMALLINT,
`purpose_code`, `purpose_label`, `status` (enum PENDING/APPROVED/REJECTED),
`credit_check_due_at`, `decided_at` (nullable), `created_at`, `updated_at`

**[ASSUMPTION]** UUID primary keys: defence-in-depth against id enumeration on top of
ownership checks. Trade-off: random UUIDs fragment InnoDB indexes — irrelevant at this scale.

Schema changes via TypeORM migrations only (`synchronize: false`).

### 5.4 API surface


| Method | Path                                          | Role              | FR       |
| ------ | --------------------------------------------- | ----------------- | -------- |
| POST   | `/auth/register`                              | public            | AUTH-1   |
| POST   | `/auth/login`                                 | public            | AUTH-2   |
| POST   | `/auth/logout`                                | any               | AUTH-2   |
| GET    | `/auth/me`                                    | any               | AUTH-5   |
| GET    | `/loan-purposes`                              | any               | LP-1     |
| POST   | `/applications`                               | CUSTOMER          | APP-1    |
| GET    | `/applications`                               | CUSTOMER (own)    | VIEW-1   |
| GET    | `/applications/:id`                           | owner or ADMIN    | VIEW-2/5 |
| GET    | `/admin/applications?status=&page=&pageSize=` | ADMIN             | VIEW-3/4 |
| GET    | `/applications/events`                        | CUSTOMER (if SSE) | RT-1     |


All routes under `/api` prefix.

---



## 6. Delivery plan (each step = one review gate + commit)


| Step | Scope                                                                   | FRs             |
| ---- | ----------------------------------------------------------------------- | --------------- |
| 1    | Nx scaffold (official generators), untouched commit; then docs commit   | —               |
| 2    | docker-compose MySQL, config validation, `.env.example`                 | NFR-SEC-4, DX-1 |
| 3    | Entities + migrations + indexes                                         | §5.3, PERF-1    |
| 4    | Auth + roles + admin seed (API + web)                                   | AUTH-*          |
| 5    | Loan purposes: slow provider, cache, warm-up, single-flight (API + web) | LP-*            |
| 6    | Submit application + shared validation (API + web)                      | APP-*           |
| 7    | Credit-check worker                                                     | CC-*            |
| 8    | Real-time updates                                                       | RT-*            |
| 9    | Lists, detail, pagination, admin filter, masking (API + web)            | VIEW-*          |
| 10   | Seed 10k                                                                | SEED-*          |
| 11   | Hardening + tests                                                       | NFR-*           |
| 12   | README + AI_USAGE.md                                                    | —               |




## 7. Decisions

Resolved before the build phase.

| #   | Decision                  | Resolution                                                                                                                                                                                                                                           |
| --- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Credit-check scheduling   | **BullMQ delayed jobs + Redis.** The `loan_applications` row is the source of truth (`credit_check_due_at`, `status`); job id = application id; on boot, re-enqueue every `PENDING` row so a lost Redis does not lose work. The decision is still the guarded `UPDATE … WHERE status = 'PENDING'` (FR-CC-5) |
| D2  | Real-time mechanism       | **SSE** (`GET /applications/events`, cookie auth, client invalidates React Query on event)                                                                                                                                                             |
| D3  | UI kit                    | **Tailwind CSS + shadcn/ui**                                                                                                                                                                                                                           |
| D4  | Password hashing          | **argon2id** (`argon2` package)                                                                                                                                                                                                                        |
| D5  | Credit decision rule      | **Pure random**                                                                                                                                                                                                                                        |
| D6  | Idempotency-Key on submit | **Yes**: optional `Idempotency-Key` header, unique per `(user_id, idempotency_key)`                                                                                                                                                                    |
| D7  | Status audit table        | **Yes**: `application_status_events` (append-only)                                                                                                                                                                                                     |

Also decided: Swagger UI at `/api/docs`; rate limiting (`@nestjs/throttler`) on the auth endpoints; password
policy is 12-128 characters (argon2id has no 72-byte limit).



## 8. With more time (seed for README)

Refresh-token rotation, MFA, password reset; Redis cache + pub/sub for multi-instance;
cursor pagination; admin actions with maker-checker; status audit trail; OpenAPI docs;
Playwright E2E; CI pipeline with SBOM generation and dependency scanning; observability
(structured logs, metrics, tracing).