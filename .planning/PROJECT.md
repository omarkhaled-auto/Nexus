# Nexus

## What This Is

Nexus is an autonomous AI application builder that transforms vague ideas into fully-functional, tested, production-ready applications with minimal human intervention. It operates in two modes: Genesis (creates new applications from scratch through conversational interviews) and Evolution (enhances existing projects via visual Kanban interface). A multi-agent system with specialized AI workers executes atomic tasks in parallel, self-heals through automated QA loops, and maintains comprehensive state for session recovery.

## Core Value

Enable anyone to build production-quality software by describing what they want in natural language, with Claude handling all implementation details while maintaining quality through automated testing and code review.

## Requirements

### Validated

(None yet — ship to validate)

### Active

**Genesis Mode (New Applications)**
- [ ] Conversational interview engine that captures requirements through natural dialogue
- [ ] Requirements database with 6 categories: functional, non-functional, UI/UX, technical, business logic, integrations
- [ ] MoSCoW prioritization (must/should/could/won't) for all requirements
- [ ] Research engine that gathers technical context (competitor analysis, API documentation, best practices)
- [ ] Automatic feature decomposition into sub-features and atomic tasks
- [ ] Real-time requirements sidebar showing captured requirements during interview
- [ ] Scope estimation with task counts and time projections

**Evolution Mode (Existing Projects)**
- [ ] Kanban board with columns: Backlog → In Progress → AI Review → Human Review → Done
- [ ] Drag-and-drop feature cards between columns
- [ ] Feature complexity classification (simple: 10-20 tasks, complex: 30-100+ tasks)
- [ ] Manual feature addition and modification

**Planning Layer**
- [ ] Task decomposition with 30-minute maximum per task (enforced)
- [ ] Task sizing: Atomic (5-15 min, single file) or Small (15-30 min, 1-2 files)
- [ ] Dependency resolution using Kahn's algorithm for topological ordering
- [ ] Parallel wave calculation for concurrent task execution
- [ ] Time estimation based on complexity and historical velocity

**Multi-Agent System**
- [ ] Planner Agent (Claude Opus 4) - Strategic planning, task decomposition
- [ ] Coder Agent (Claude Sonnet 4) - Code generation, implementation
- [ ] Reviewer Agent (Gemini 2.5 Pro) - Code review, large context analysis
- [ ] Tester Agent (Claude Sonnet 4) - Test generation and execution
- [ ] Merger Agent (Claude Sonnet 4) - Git operations, conflict resolution
- [ ] Agent pool with lifecycle management (spawn, monitor, terminate)
- [ ] Up to 4 concurrent agents with isolated git worktrees
- [ ] Per-agent tool access: file_read, file_write, terminal, search, git

**QA Loop (Self-Healing Execution)**
- [ ] 4-stage loop: Build → Lint → Test → Review
- [ ] Maximum 50 iterations per task before human escalation
- [ ] Automatic error classification and fix attempts
- [ ] AI-powered code review with approval/rejection
- [ ] Iteration tracking and metrics collection

**Persistence Layer**
- [ ] SQLite database with Drizzle ORM for structured data
- [ ] STATE.md file format for human-readable project state
- [ ] .continue-here.md for mid-task resume points
- [ ] Checkpoint system for session recovery (auto + manual)
- [ ] Long-term memory with embeddings for patterns, decisions, gotchas
- [ ] Requirements database stored as JSON in structured folders

**Infrastructure Layer**
- [ ] Git worktree isolation per agent (branch pattern: nexus/task/{taskId}/{timestamp})
- [ ] Worktree registry in .nexus/worktrees/registry.json
- [ ] File system operations with cross-platform path handling (pathe)
- [ ] Process runner with command validation and blocked patterns
- [ ] LSP client for code intelligence (TypeScript, Python, Go, Rust)

**User Interface**
- [ ] Electron desktop application
- [ ] React 19 with Zustand state management
- [ ] shadcn/ui component library with Tailwind CSS
- [ ] Interview page with chat interface and requirements sidebar
- [ ] Kanban page with drag-drop feature management
- [ ] Dashboard page with progress charts, agent status grid, metrics panel
- [ ] Settings page for configuration
- [ ] Real-time event updates via EventBus
- [ ] Framer Motion animations

**Observability**
- [ ] Progress dashboard with real-time metrics
- [ ] Agent status grid showing activity and state
- [ ] Event log with chronological activity feed
- [ ] Token usage and cost tracking per agent/task
- [ ] Task completion statistics and velocity

**Human Checkpoints**
- [ ] 5 mandatory checkpoints: Foundation, Persistence, Single Agent, Multi-Agent, MVP
- [ ] Review requests for significant decisions
- [ ] Approval/rejection flow with feedback
- [ ] Escalation after QA loop exhaustion

### Out of Scope

- Cloud/SaaS deployment — Desktop-only Electron app, no hosted version
- Team collaboration features — Single user (you) with Claude as builder
- Mobile app version — Desktop focus for v1
- Multi-language UI — English only for v1
- Custom model training — Uses existing Claude/Gemini/OpenAI APIs
- Production hosting features — Builds apps locally, deployment is user's responsibility

## Context

**Architecture:**
- 7-layer architecture: UI → Orchestration → Planning → Execution → Quality → Persistence → Infrastructure
- 43 components total across all layers
- Event-driven communication with EventBus
- Ralph ACP protocol for multi-provider agent support

**Existing Documentation:**
- 05_ARCHITECTURE_BLUEPRINT.md - Complete architecture specs (18,756 lines)
- 06_INTEGRATION_SPECIFICATION.md - Implementation details
- 07_NEXUS_MASTER_BOOK.md - Full implementation guide (8,235 lines)
- NEXUS_SURGICAL_EXECUTION_PLAN.md - BUILD items and sprint breakdown
- PLAN.md - Detailed task-level execution plan

**Build Metrics:**
- 16 BUILD items across 5 sprints
- 158 total files (98 source, 48 tests, 12 config)
- ~9,500-11,500 lines of code
- 302 hours sequential, ~206 hours with 4 parallel agents
- ~293 unit tests, ~40 integration tests, ~13 E2E tests
- Target coverage: 80%+

## Constraints

- **Tech Stack**: Electron + React 19 + TypeScript 5.3+ + SQLite (better-sqlite3) + Drizzle ORM + Vitest + Playwright — Chosen for desktop portability and no external database dependencies
- **Task Size**: Maximum 30 minutes per atomic task — Core Nexus principle for predictability and recoverability
- **QA Iterations**: Maximum 50 per task — Prevents infinite loops, triggers human escalation
- **Agent Concurrency**: Maximum 4 agents — Balance of parallelism vs. resource usage
- **Model Selection**: Opus for planning, Sonnet for coding/testing, Gemini for review — Optimized for each role's requirements
- **Git Strategy**: Worktrees per agent — True isolation, no merge conflicts during parallel execution

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| 7-layer architecture | Clear separation of concerns, testable components | — Pending |
| SQLite + JSON files | No external dependencies, portable, human-readable | — Pending |
| Git worktrees for isolation | True parallel execution without merge conflicts | — Pending |
| 30-minute task limit | Predictable execution, easy recovery from failures | — Pending |
| 5 specialized agents | Optimal model selection per role, clear responsibilities | — Pending |
| QA loop with 50 iterations | Self-healing with escalation fallback | — Pending |
| GSD STATE.md format | Human-readable state, easy debugging | — Pending |
| Zustand for UI state | Simple, no boilerplate, TypeScript-friendly | — Pending |

---
*Last updated: 2026-01-14 after initialization*
