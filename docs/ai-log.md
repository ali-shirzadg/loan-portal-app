# AI Usage Log

A running record of how I used AI while building this project. I add an entry after each
step, so this log grows with the commit history. It is the raw material for `AI_USAGE.md`.

**Legend:** ✅ accepted · ✏️ accepted with changes · ❌ rejected · ⚠️ AI mistake I caught

---

## Tools


| Tool              | Model           | What I use it for                                                                                                    |
| ----------------- | --------------- | -------------------------------------------------------------------------------------------------------------------- |
| Claude Code (CLI) | Claude Opus 5.5 | Reading the brief, research, planning, explaining concepts, reviewing my code, running official scaffolding commands |


## Ground rules

These rules are written down in `[CLAUDE.md](../CLAUDE.md)` so the AI follows them in every session.


| Rule                                                                 | Why                                                          |
| -------------------------------------------------------------------- | ------------------------------------------------------------ |
| I write the application code. The AI explains, answers and reviews.  | I must understand and own every line.                        |
| AI code snippets are labelled and recorded here.                     | Clear record of what came from the AI.                       |
| Only official scaffolding and official docs.                         | Predictable, trusted starting point.                         |
| No real personal data or secrets — in code, seeds, tests or prompts. | Banking data rules. NRICs, names and phones are always fake. |
| The AI must not commit, push or install packages unless I ask.       | I stay in control of the repository.                         |


---



## Overview


| #   | Step                      | Date               | AI role                                         | Result                                   |
| --- | ------------------------- | ------------------ | ----------------------------------------------- | ---------------------------------------- |
| 0   | Planning and tech choices | 2026-10-16 → 10-19 | Analysis, research, drafted PRD and `CLAUDE.md` | PRD and working agreement committed      |
| 1   | Scaffolding               | 2026-10-19         | Ran the official generators I chose             | Nx workspace with `api`, `web`, `shared` |
| 2a  | MySQL with Docker         | 2026-10-19         | Gave a reference `docker-compose.yml`           | MySQL 9.7 running and healthy            |


---



## Step 0 — Planning and tech choices

**What I did:** I chose the technologies and decided to start from official scaffolding.
I wrote a PRD (product requirements document) as the starting point for the whole application.

**My stack choices:**


| Area              | Choice                                           | Reason                                                      |
| ----------------- | ------------------------------------------------ | ----------------------------------------------------------- |
| Monorepo          | Nx                                               | Preferred by the brief                                      |
| Backend           | NestJS + TypeORM + MySQL                         | Required stack; TypeORM is Nest's long-standing integration |
| Shared validation | class-validator DTOs in `libs/shared`            | One set of rules for both frontend and backend              |
| Frontend          | React + Vite, bulletproof-react folder structure | Clear, well-known feature-based structure                   |
| Data fetching     | TanStack React Query                             | Caching and retries                                         |
| Forms             | react-hook-form                                  | Works with class-validator through `@hookform/resolvers`    |


**How I used the AI:**


| AI suggestion                                                                                                                                                  | Decision                 | Why                                                                                                                   |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| Build the whole app for me                                                                                                                                     | ❌ Rejected               | I want to build it myself and be able to explain every part. The AI works as a mentor and reviewer instead.           |
| Analyse the brief for hidden requirements (caching for the slow loan purposes, durable credit check, live updates, pagination for 10k rows, access control)    | ✅ Accepted               | Helped me see what the brief is really testing.                                                                       |
| Research what a good AI usage report looks like in banking                                                                                                     | ✅ Accepted               | Key ideas: name the exact tools, show human review and accountability, list rejected suggestions, keep a log as I go. |
| Notes on my React Query example: avoid `as` type casts, avoid request waterfalls, **never auto-retry a loan submission** (could create duplicate applications) | ✅ Accepted               | Added to the PRD and `CLAUDE.md`.                                                                                     |
| Warning: `@IsIdentityCard()` has no Malaysian locale, so NRIC needs a custom validator                                                                         | ✅ Accepted               | AI checked the validator.js docs. I will write a custom `@IsMalaysianNric()`.                                         |
| Draft the PRD and `CLAUDE.md`                                                                                                                                  | ✏️ Accepted with changes | I reviewed both and asked for corrections (see "AI mistakes caught").                                                 |


---



## Step 1 — Scaffolding

**What I did:** I created the Nx workspace with a NestJS backend (`api`), a React frontend
(`web`) and a shared library (`shared`). The AI ran the official generators with the options
I agreed to. No files were edited by hand.


| Command                                                                                       | Creates                               |
| --------------------------------------------------------------------------------------------- | ------------------------------------- |
| `npx create-nx-workspace@23.3.0 loan-portal --preset=nest --appName=api --workspaces=false …` | Workspace, `apps/api`, `apps/api-e2e` |
| `npx nx add @nx/react@23.3.0`                                                                 | React plugin                          |
| `npx nx g @nx/react:app apps/web --bundler=vite --unitTestRunner=vitest …`                    | `apps/web`                            |
| `npx nx g @nx/js:lib libs/shared --bundler=none …`                                            | `libs/shared` (`@loan-portal/shared`) |


**Key option choices:**


| Option               | Choice                              | Why                                                                             |
| -------------------- | ----------------------------------- | ------------------------------------------------------------------------------- |
| `--workspaces=false` | Integrated layout with path aliases | Best-documented setup for Nest + TypeORM CLI + a shared library with decorators |
| `--aiAgents=none`    | Skip Nx's generated AI files        | They would conflict with my own `CLAUDE.md`                                     |
| `--nxCloud=skip`     | No Nx Cloud                         | Not needed for this project                                                     |


**How I checked it:** `nx run-many -t lint test build typecheck` passed for all 4 projects.

**Noted for later:**


| Issue                                                                              | Plan                                                    |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Nx's React generator uses two Vite plugins that are deprecated (removed in Nx v24) | Fix in a later step; keep the scaffold commit untouched |
| `npm install` reported 44 known vulnerabilities in scaffold dependencies           | Review in Step 11 (`npm audit`)                         |


---



## Step 2a — MySQL with Docker

**What I did:** I added `docker-compose.yml` for MySQL and a `.env.example` file.


| AI suggestion                                                                                  | Decision   | Why                                                                                                                    |
| ---------------------------------------------------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------- |
| Use `mysql:9.7` — the AI checked Docker Hub: `lts` = 9.7, `latest` = 26.7 (innovation release) | ✅ Accepted | Pin a long-term-support version instead of `latest`                                                                    |
| Bind the port to `127.0.0.1` only                                                              | ✅ Accepted | Database is not reachable from the local network                                                                       |
| App connects as a normal user, not root                                                        | ✅ Accepted | Least privilege                                                                                                        |
| `${VAR:?message}` for every secret                                                             | ✅ Accepted | Docker Compose refuses to start if a secret is missing                                                                 |
| Database timezone set to UTC                                                                   | ✅ Accepted | All timestamps stored in UTC (PRD NFR-TIME-1)                                                                          |
| Healthcheck over TCP                                                                           | ✅ Accepted | Avoids reporting "healthy" while MySQL is still initialising                                                           |
| Make `npm run dev` also start MySQL                                                            | ❌ Rejected | The database and the apps have different lifecycles. I start the database once with `db:up`; `dev` only runs the apps. |


**How I checked it:** `docker compose ps` shows MySQL as **healthy**. `.env` is git-ignored;
`.env.example` is committed.

---



## AI mistakes caught


| #    | Where       | What the AI said                       | What is correct                                                                             | Fixed in                 |
| ---- | ----------- | -------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------ |
| ⚠️ 1 | PRD §7 (D4) | "bcrypt — no native build issues"      | `bcrypt` **is** a native addon. `bcryptjs` is the pure-JS version. `argon2` is also native. | PRD, before first commit |
| ⚠️ 2 | PRD §3.1    | Password "max 72 chars (bcrypt limit)" | bcrypt's limit is **72 bytes**, not characters. Multi-byte characters hit it sooner.        | PRD, before first commit |


---



## Repository and history notes


| What happened                                                                                      | Why                                                                                 |
| -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| First repository had one big "initial commit", and it included the assessment PDF in a public repo | —                                                                                   |
| I deleted it and started a fresh repo with the same name                                           | To have a clean, step-by-step history. Nobody else had cloned it, so this was safe. |
| The assessment PDF is now git-ignored and kept only on my machine                                  | It is the company's document and should not be public.                              |
| Commit dates are real (not backdated)                                                              | The history must be honest.                                                         |


---



## Next

1. Add root scripts: `dev` (run both apps), `db:up`, `db:down`, `check`.
2. Step 2b — validate configuration at startup (`@nestjs/config` + class-validator).
3. Authentication: register and login (backend), forms (frontend), connect frontend and backend
  through the API with React Query.

