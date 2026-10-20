# AI usage

**Tool:** Claude Code (Claude Opus), with Sonnet and Haiku subagents for parallel and smaller tasks.

I have been building software for more than ten years, and I ran this project the way I run a
team: I set the direction, and the agents did the typing.

- **What to build:** I read the brief, then reviewed and corrected the PRD before any code was written.
- **How to build it:** the stack, architecture, data model, security rules and trade-offs were my
  decisions, written into `CLAUDE.md` so every agent followed them.
- **Agent-driven development:** Claude Code built the app step by step from that plan, one commit per step.
- **Review:** I reviewed the result, changed or rejected what did not meet my standard, and
  accepted nothing that had not been tested and checked by hand.
