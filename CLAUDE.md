# CLAUDE.md — Loan Application Portal

Project guide. Requirements live in `docs/PRD.md`, the database schema in `docs/database-schema.md`.

## 1. Working agreement

- Work through PRD §6 one step at a time; each step ends with a small Conventional Commit.
- Verify library APIs, decorators and CLI flags against official docs before using them.
  Never invent package versions.
- Prefer official generators and official docs (Nx, NestJS, TypeORM, TanStack Query,
  react-hook-form, shadcn/ui) over third-party boilerplates.
- Commit locally only. Never push unless asked.

## 2. Stack

Nx monorepo · NestJS + TypeORM + MySQL (`apps/api`) · BullMQ + Redis (credit-check queue) ·
React + Vite + Tailwind + shadcn/ui + TanStack Query + react-hook-form (`apps/web`) ·
class-validator DTOs shared via `libs/shared` · Docker Compose for MySQL and Redis.

## 3. Architecture rules

- `libs/shared` **ships to the browser.** Only DTO classes, enums, interfaces and custom
  validators. No TypeORM entities, no `@nestjs/*` imports (incl. `@nestjs/swagger`, `@nestjs/mapped-types`).
- Backend validation is authoritative; frontend validation reuses the same DTO via `classValidatorResolver`.
- Global `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })`.
- Ownership enforced in the DB query (`WHERE user_id = :currentUser`); non-owner → `404`.
- Money is `DECIMAL(12,2)`, carried as a string in TypeScript; never JS float math for stored amounts.
- Schema changes only via TypeORM migrations (`synchronize: false`, `migrationsRun: false`).
- Store timestamps in UTC; display in `Asia/Kuala_Lumpur`.
- The database row is the source of truth for application status; the queue only schedules work.
- Frontend follows bulletproof-react: `app → features → shared`, no cross-feature imports,
  no barrel files, one file per API request in `features/<f>/api/`.
- TanStack Query: key factories; no `as` casts on responses; queries retry network/5xx only;
  **mutations never retry**.

## 4. Security and data rules

- Never use real personal data. NRICs, names and phones are synthetic, in code, seeds and tests.
- Never put secrets in code or commits. `.env` is git-ignored; `.env.example` is committed.
- Never log NRIC, phone, income or passwords. Mask NRIC in list views.
- Auth token lives in an `httpOnly` cookie, never `localStorage`.
- Registration always creates `CUSTOMER`; admins only via the seed command.
- Passwords hashed with Argon2id (OWASP parameters).

## 5. Conventions

- Conventional Commits (`feat(api): …`, `fix(web): …`, `chore: …`, `docs: …`), small and focused.
- Commit messages never mention the AI (no `AI-assisted:` or `Co-Authored-By` lines).
- Reference PRD ids (`FR-CC-5`) in commit bodies and test names where relevant.

## 6. Definition of done (per step)

1. `npm run check` (lint, typecheck, test, build) passes.
2. Behaviour checked manually against the step's acceptance criteria in the PRD.
3. Committed.

## 7. Commands

```bash
npm run db:up            # MySQL + Redis (docker compose)
npm run db:migrate       # apply migrations
npm run seed             # admin + demo customers + 10k applications
npm run dev              # API + web
npm run check            # lint, typecheck, test, build
```
