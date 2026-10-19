# CLAUDE.md — Loan Application Portal

AI working agreement for this repository. Requirements live in `docs/PRD.md` — read it before
answering questions about scope. This file is committed on purpose: it shows how AI assistance
was governed during the assessment.

## 1. Collaboration mode (highest priority)

The developer writes the code. The AI's default role is **mentor and reviewer**.

- Do **not** create or edit files under `apps/`, `libs/`, or config files unless the developer
explicitly asks for it in that message ("write it", "apply this"). Explaining, answering and
reviewing need no files.
- Work one step at a time (PRD §6). Start each reply with the current step.
- When giving a code snippet, mark it `AI snippet` so the developer can record it in `docs/ai-log.md`.
- Reviews: findings ranked **blocker / major / minor / nit**, each with `file:line`, what is
wrong, why it matters, and a direction for the fix — not a full rewrite.
- Verify library APIs, decorators and CLI flags against official docs before stating them.
Never invent package versions. Say "I'm not sure" when unsure.
- Prefer official generators and official docs (Nx, NestJS, TypeORM, TanStack Query,
react-hook-form) over third-party boilerplates.
- Do not commit, push or install packages unless asked.



## 2. Stack

Nx monorepo · NestJS + TypeORM + MySQL (`apps/api`) · React + Vite + TanStack Query +
react-hook-form (`apps/web`) · class-validator DTOs shared via `libs/shared` · Docker Compose for MySQL.

## 3. Architecture rules

- `libs/shared` **ships to the browser.** Only DTO classes, enums, interfaces and custom
validators. No TypeORM entities, no `@nestjs/*` imports (incl. `@nestjs/swagger`, `@nestjs/mapped-types`).
- Backend validation is authoritative; frontend validation reuses the same DTO via `classValidatorResolver`.
- Global `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })`.
- Ownership enforced in the DB query (`WHERE user_id = :currentUser`); non-owner → `404`.
- Money is `DECIMAL(12,2)`; never JS float math for stored amounts.
- Schema changes only via TypeORM migrations (`synchronize: false`).
- Store timestamps in UTC; display in `Asia/Kuala_Lumpur`.
- Frontend follows bulletproof-react: `app → features → shared`, no cross-feature imports,
no barrel files, one file per API request in `features/<f>/api/`.
- TanStack Query: key factories; no `as` casts on responses; queries retry network/5xx only;
**mutations never retry**.



## 4. Security and data rules

- Never use real personal data. NRICs, names and phones are synthetic — in code, seeds,
tests **and prompts**.
- Never put secrets in code, prompts or commits. `.env` is git-ignored; `.env.example` is committed.
- Never log NRIC, phone, income or passwords. Mask NRIC in list views.
- Auth token lives in an `httpOnly` cookie, never `localStorage`.
- Registration always creates `CUSTOMER`; admins only via the seed command.



## 5. Conventions

- Conventional Commits (`feat(api): …`, `fix(web): …`, `chore: …`, `docs: …`), small and focused.
- When the AI contributed code to a commit, add a body line: `AI-assisted: <what>`.
- After each step, append an entry to `docs/ai-log.md`:
`step · asked · AI suggested · accepted / modified / rejected + why · how verified · time spent`.
- Reference PRD ids (`FR-CC-5`) in commit bodies and test names where relevant.



## 6. Definition of done (per step)

1. `nx run-many -t lint typecheck test` passes for affected projects.
2. Behaviour checked manually against the step's acceptance criteria in the PRD.
3. Developer has reviewed the diff (AI review optional, findings addressed or consciously deferred).
4. Committed, ai-log entry written.



## 7. Commands

*Fill in after scaffolding (Step 1–2).*

```bash
docker compose up -d                 # MySQL
npx nx serve api                     # API
npx nx serve web                     # Web
npx nx run-many -t lint typecheck test
# migrations / seed-admin / seed: TBD
```

