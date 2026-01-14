# Roadmap: Nexus

## Overview

Nexus is built in 12 phases following a bottom-up architecture approach. We start with foundation and infrastructure, build the persistence and event layers, then construct the agent system piece by piece. Genesis and Evolution modes come after the core agent machinery works. Finally, we add the dashboard, observability, and polish for a production-ready application.

## Domain Expertise

None (no domain expertise files configured)

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [x] **Phase 1: Foundation** - Project setup, TypeScript config, build tooling, infrastructure services ✓
- [x] **Phase 2: Persistence** - StateManager, CheckpointManager, MemorySystem, RequirementsDB ✓
- [ ] **Phase 3: LLM & Agents** - LLM clients (Claude/Gemini), agent runners, quality layer, QA loop
- [ ] **Phase 4: Event System** - EventBus implementation, event types, pub/sub infrastructure
- [ ] **Phase 5: Agent Core** - Agent pool, lifecycle management, tool access system, model providers
- [ ] **Phase 6: Planning Layer** - Task decomposition, dependency resolution, parallel wave calculation
- [ ] **Phase 7: Execution Layer** - Single agent execution, QA loop (build/lint/test/review)
- [ ] **Phase 8: Multi-Agent** - Concurrent agents, worktree coordination, merge handling
- [ ] **Phase 9: Genesis Mode** - Interview engine, requirements database, research engine
- [ ] **Phase 10: Evolution Mode** - Kanban board, feature management, drag-drop interface
- [ ] **Phase 11: Dashboard** - Progress metrics, agent status grid, event log, cost tracking
- [ ] **Phase 12: Polish** - Human checkpoints, settings page, animations, integration testing

## Phase Details

### Phase 1: Foundation
**Goal**: Working Electron + React 19 + TypeScript application with proper build tooling
**Depends on**: Nothing (first phase)
**Research**: Unlikely (established Electron + Vite + React patterns)
**Plans**: TBD

Key deliverables:
- Electron main/renderer process setup
- React 19 with Vite bundler
- TypeScript 5.3+ strict mode configuration
- Tailwind CSS + shadcn/ui component library
- Zustand state management scaffold
- Basic window with navigation shell

### Phase 2: Persistence
**Goal**: Complete data persistence layer with state management, checkpoints, memory, and requirements
**Depends on**: Phase 1
**Research**: Unlikely (Drizzle ORM patterns established in Phase 1)
**Plans**: 3 total

Key deliverables:
- StateManager for project state persistence
- CheckpointManager for state snapshots and recovery
- StateFormatAdapter for STATE.md export/import
- MemorySystem with EmbeddingsService for long-term memory
- RequirementsDB for structured requirement storage

### Phase 3: LLM & Agents
**Goal**: LLM client integration and agent execution framework with self-healing QA loop
**Depends on**: Phase 2
**Research**: Likely (Claude/Gemini API integration)
**Plans**: 3 total

Key deliverables:
- ClaudeClient with streaming, tool use, retry logic
- GeminiClient for code review (large context)
- LLMProvider for model routing per agent type
- AgentRunner base class with tool loop
- CoderRunner, TesterRunner, ReviewerRunner, MergerRunner
- BuildVerifier, LintRunner, TestRunner, CodeReviewer
- QALoopEngine (Build → Lint → Test → Review cycle)

**Success Criteria**: Single agent completes a task through full QA loop

### Phase 4: Event System
**Goal**: Event-driven communication infrastructure for all layers
**Depends on**: Phase 1
**Research**: Unlikely (internal pub/sub patterns)
**Plans**: TBD

Key deliverables:
- EventBus singleton with typed events
- Event type definitions for all system events
- Subscription management with cleanup
- Event logging for observability
- IPC bridge between main/renderer processes

### Phase 5: Agent Core
**Goal**: Agent pool with lifecycle management and multi-provider support
**Depends on**: Phase 3, Phase 4
**Research**: Likely (Claude/Gemini API integration, Ralph ACP protocol)
**Research topics**: Claude Agent SDK patterns, Gemini 2.5 Pro API, multi-provider abstraction
**Plans**: TBD

Key deliverables:
- Agent base class with lifecycle (spawn, monitor, terminate)
- Model provider abstraction (Claude Opus/Sonnet, Gemini)
- Agent pool with max 4 concurrent agents
- Per-agent tool access configuration
- Agent state persistence
- Ralph ACP protocol implementation

### Phase 6: Planning Layer
**Goal**: Intelligent task decomposition with dependency resolution
**Depends on**: Phase 5
**Research**: Unlikely (internal algorithms)
**Plans**: TBD

Key deliverables:
- Task decomposition engine (30-min max enforcement)
- Task sizing (Atomic: 5-15min, Small: 15-30min)
- Dependency resolution with Kahn's algorithm
- Parallel wave calculation for concurrent execution
- Time estimation based on complexity
- Feature complexity classification

### Phase 7: Execution Layer
**Goal**: Single agent task execution with self-healing QA loop
**Depends on**: Phase 6
**Research**: Likely (Claude Agent SDK tool use patterns)
**Research topics**: Claude tool use best practices, error recovery patterns, code review automation
**Plans**: TBD

Key deliverables:
- Single agent task executor
- 4-stage QA loop: Build → Lint → Test → Review
- Error classification and auto-fix attempts
- AI-powered code review (Gemini 2.5 Pro)
- Iteration tracking (max 50 per task)
- Human escalation triggers

### Phase 8: Multi-Agent
**Goal**: Concurrent agent orchestration with isolated worktrees
**Depends on**: Phase 7
**Research**: Likely (git worktree patterns for parallel execution)
**Research topics**: Git worktree best practices, merge conflict prevention, concurrent file access
**Plans**: TBD

Key deliverables:
- Multi-agent orchestrator
- Worktree-per-agent isolation
- Branch naming: nexus/task/{taskId}/{timestamp}
- Conflict-free merge strategies
- Agent coordination and handoff
- Resource contention handling

### Phase 9: Genesis Mode
**Goal**: Conversational interview engine for new application creation
**Depends on**: Phase 8
**Research**: Likely (conversational AI patterns, requirement extraction)
**Research topics**: Structured conversation design, requirement categorization, MoSCoW prioritization
**Plans**: TBD

Key deliverables:
- Conversational interview engine
- Requirements database (6 categories)
- MoSCoW prioritization system
- Research engine for technical context
- Automatic feature decomposition
- Real-time requirements sidebar
- Scope estimation with projections

### Phase 10: Evolution Mode
**Goal**: Kanban-based feature management for existing projects
**Depends on**: Phase 8
**Research**: Unlikely (React drag-drop with established patterns)
**Plans**: TBD

Key deliverables:
- Kanban board UI (Backlog → In Progress → AI Review → Human Review → Done)
- Drag-and-drop feature cards
- Feature complexity classification
- Manual feature addition/modification
- Integration with planning layer

### Phase 11: Dashboard
**Goal**: Real-time observability with metrics and status tracking
**Depends on**: Phase 10
**Research**: Unlikely (React + Zustand + shadcn/ui patterns)
**Plans**: TBD

Key deliverables:
- Progress dashboard with real-time metrics
- Agent status grid (activity, state)
- Chronological event log
- Token usage and cost tracking
- Task completion statistics
- Velocity tracking

### Phase 12: Polish
**Goal**: Final integration, human checkpoints, and production readiness
**Depends on**: Phase 11
**Research**: Unlikely (Framer Motion, established patterns)
**Plans**: TBD

Key deliverables:
- 5 mandatory human checkpoints (Foundation, Persistence, Single Agent, Multi-Agent, MVP)
- Review request and approval flow
- Settings page with configuration
- Framer Motion animations
- End-to-end integration testing
- Error boundary and recovery
- Final bug fixes and polish

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 8/8 | Complete | 2026-01-14 |
| 2. Persistence | 3/3 | Complete | 2026-01-14 |
| 3. LLM & Agents | 0/3 | Not started | - |
| 4. Event System | 0/TBD | Not started | - |
| 5. Agent Core | 0/TBD | Not started | - |
| 6. Planning Layer | 0/TBD | Not started | - |
| 7. Execution Layer | 0/TBD | Not started | - |
| 8. Multi-Agent | 0/TBD | Not started | - |
| 9. Genesis Mode | 0/TBD | Not started | - |
| 10. Evolution Mode | 0/TBD | Not started | - |
| 11. Dashboard | 0/TBD | Not started | - |
| 12. Polish | 0/TBD | Not started | - |
