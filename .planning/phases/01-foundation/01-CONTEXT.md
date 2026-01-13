# Phase 1: Foundation - Context

**Gathered:** 2026-01-14
**Status:** Ready for planning

<vision>
## How This Should Work

Phase 1 establishes the complete foundational infrastructure for Nexus. This follows the Master Book's Sprint 1 specification (BUILD-001 through BUILD-004) — a sequential 38-hour build that creates the bedrock everything else depends on.

When this phase is complete, we have:
- A properly configured TypeScript project with strict mode, ESLint, Vitest, and Playwright
- Complete type definitions for the entire system (core, task, agent, events, API)
- Rock-solid infrastructure services: FileSystem, ProcessRunner, GitService, WorktreeManager
- SQLite database with Drizzle ORM, schema, and migrations

This is backend-first infrastructure. No UI yet — just the reliable services that agents will use to interact with files, run commands, manage git worktrees, and persist data.

**Reference:** `07_NEXUS_MASTER_BOOK.md` Section 4.2 "Sprint 1: Foundation"

</vision>

<essential>
## What Must Be Nailed

- **Infrastructure reliability** — FileSystemService, ProcessRunner, GitService, and WorktreeManager must be rock-solid. Agents depend on these working perfectly every time. Cross-platform path handling (pathe), proper timeout support, and clean error handling are non-negotiable.

- **Sequential execution** — BUILD-001 → BUILD-002 → BUILD-003 → BUILD-004 must be strictly sequential due to dependencies. No shortcuts.

- **Verification gates** — Each BUILD task has specific verification commands that must pass:
  - `pnpm install` completes without errors
  - `pnpm typecheck` passes
  - `pnpm lint` passes
  - `pnpm test` passes with 80%+ coverage for infrastructure

</essential>

<boundaries>
## What's Out of Scope

- UI/Electron shell — No window, no React components yet. This is backend-only.
- State Management (BUILD-005) — That's Phase 2
- Memory System (BUILD-006) — That's Phase 2
- LLM Clients (BUILD-008) — That's Phase 3
- Agent Runners (BUILD-009) — That's Phase 3
- Any deviation from the Master Book specification

</boundaries>

<specifics>
## Specific Ideas

**Follow Master Book exactly:**
- Libraries: `pathe`, `fs-extra`, `chokidar`, `fast-glob` for FileSystem
- Libraries: `execa`, `tree-kill` for ProcessRunner
- Libraries: `simple-git` for GitService
- Libraries: `better-sqlite3`, `drizzle-orm` for Database
- TypeScript strict mode, ESLint flat config
- Vitest for unit/integration tests, Playwright for E2E

**Build tasks (38h total):**
| Task | Hours | Description |
|------|-------|-------------|
| BUILD-001 | 4h | Project Initialization — package.json, tsconfig, eslint, vitest, playwright configs |
| BUILD-002 | 6h | Type Definitions — src/types/core.ts, task.ts, agent.ts, events.ts, api.ts |
| BUILD-003 | 16h | Infrastructure Layer — FileSystemService, ProcessRunner, GitService, WorktreeManager |
| BUILD-004 | 12h | Database Foundation — Drizzle ORM + better-sqlite3, schema, migrations |

**Key implementation notes from Master Book:**
1. Use `pathe` for cross-platform path handling
2. GitService should support custom binary path (for Electron)
3. WorktreeManager stores metadata in `.nexus/worktrees/registry.json`
4. ProcessRunner needs timeout support (default 30s)
5. Database uses WAL mode for better-sqlite3

</specifics>

<notes>
## Additional Context

This phase consolidates what the original roadmap had as Phases 1-3 (Foundation, Infrastructure, Persistence) into a single cohesive "Foundation" phase following the Master Book's Sprint 1 structure.

The user prioritizes infrastructure reliability above all — these services are what agents will use to interact with the real world, so they must work perfectly.

</notes>

---

*Phase: 01-foundation*
*Context gathered: 2026-01-14*
