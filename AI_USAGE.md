# AI usage

**Tool:** Claude Code (Claude Opus), with Sonnet and Haiku subagents for parallel and smaller tasks.

## Before the PRD

I chose the stack and the approach before any requirements were written:

- Nx monorepo, NestJS with TypeORM and MySQL, React with Vite.
- class-validator DTOs in a shared library, so the API and the browser use the same rules.
- bulletproof-react structure, TanStack Query for caching and retries, react-hook-form for forms.
- Official generators and official docs only, no third-party boilerplates.

Claude Code analysed the brief for what it was really testing (the slow upstream, the long-running
credit check, live updates, 10,000 rows, access control) and drafted the PRD and `CLAUDE.md` from
these choices. I reviewed both and had mistakes corrected before the first commit.

## First steps: AI as mentor

For scaffolding, Docker and config validation I worked hands-on. The agent ran the generators I
picked, explained options and reviewed my code. The early `CLAUDE.md` and the development log in the
history are from this phase.

## Then: agent-driven development

To move faster, I switched to agent-driven development. I kept the architecture decisions: BullMQ
and Redis for the credit check, SSE for live updates, Tailwind with shadcn/ui, argon2id, rate
limiting, Swagger, idempotency keys, an audit table, and later encryption of personal data at rest.
Claude Code implemented them step by step, one commit per step, and I reviewed the results.

## Where I overruled the agents

- `npm run dev` starts only the apps, not the database: they have different lifecycles.
- Strict TypeScript for every project, not only the API as suggested.
- The application email comes from the signed-in account and cannot be edited in the form.
