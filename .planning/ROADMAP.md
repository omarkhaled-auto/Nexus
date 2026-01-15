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
- [x] **Phase 3: LLM & Agents** - LLM clients (Claude/Gemini), agent runners, quality layer, QA loop ✓
- [x] **Phase 4: Orchestration** - Planning layer + orchestration layer (BUILD-011, BUILD-012) ✓
- [x] **Phase 5: UI Foundation** - Electron IPC, React/Vite, Zustand stores, routing (BUILD-013) ✓
- [x] **Phase 6: Interview UI** - Genesis mode interview, requirements sidebar (BUILD-014) ✓
- [x] **Phase 7: Kanban UI** - Evolution mode Kanban board, drag-drop (BUILD-015) ✓
- [ ] **Phase 8: Dashboard UI** - Progress metrics, agent status, event log (BUILD-016)
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

### Phase 4: Orchestration
**Goal**: Task planning and multi-agent orchestration (Master Book Sprint 4)
**Depends on**: Phase 3
**Research**: Unlikely (internal algorithms, established patterns)
**Plans**: 3 total
**BUILD Items**: BUILD-011 (Planning Layer, 20h) + BUILD-012 (Orchestration Layer, 28h)

Key deliverables:
- **BUILD-011 Planning Layer:**
  - TaskDecomposer - Feature → SubFeature → Task breakdown, 30-min limit
  - DependencyResolver - Topological sort, cycle detection, wave calculation
  - TimeEstimator - AI-based estimation, historical calibration
  - TaskSchemaAdapter
- **BUILD-012 Orchestration Layer:**
  - NexusCoordinator - Main orchestration entry point, Genesis/Evolution modes
  - AgentPool - Spawn and manage up to 4 agents, worktree assignment
  - TaskQueue - Priority queue with dependency awareness
  - EventBus - Cross-layer event communication
  - Bridges: AgentWorktreeBridge, PlanningExecutionBridge

**Success Criteria**: Task decomposition works, dependency resolution correct, multiple agents coordinate in parallel, events flow through system.

### Phase 5: UI Foundation
**Goal**: Set up React/Electron foundation with routing and state (BUILD-013)
**Depends on**: Phase 4
**Research**: Unlikely (established Electron + React patterns)
**Plans**: TBD

Key deliverables:
- Electron main process with window management, IPC
- React with Vite and shadcn/ui
- Zustand stores (projectStore, taskStore, agentStore, uiStore)
- UIBackendBridge for orchestration layer connection
- Routing: Genesis → Interview → Dashboard, Evolution → Kanban → Dashboard

### Phase 6: Interview UI
**Goal**: Genesis mode interview interface (BUILD-014)
**Depends on**: Phase 5
**Research**: Unlikely (React chat patterns)
**Plans**: TBD

Key deliverables:
- Interview chat interface
- Requirements sidebar with real-time capture
- Category progress indicators
- Scope estimation display

### Phase 7: Kanban UI
**Goal**: Evolution mode Kanban board (BUILD-015)
**Depends on**: Phase 5
**Research**: Unlikely (React drag-drop patterns)
**Plans**: TBD

Key deliverables:
- Kanban board (Backlog → In Progress → AI Review → Human Review → Done)
- Drag-and-drop feature cards
- Feature complexity badges
- Task breakdown view

### Phase 8: Dashboard UI
**Goal**: Real-time observability dashboard (BUILD-016)
**Depends on**: Phase 5
**Research**: Unlikely (React + charts)
**Plans**: TBD

Key deliverables:
- Progress metrics and charts
- Agent status grid
- Event log with filtering
- Token usage and cost tracking

### Phase 9: Interview Engine
**Goal**: Genesis mode conversation engine backend
**Depends on**: Phase 4
**Research**: Likely (conversational AI patterns)
**Plans**: TBD

Key deliverables:
- InterviewEngine - Conversational requirement capture
- RequirementExtractor - AI-powered requirement parsing
- ResearchEngine - Technical context gathering
- Scope estimation algorithms

### Phase 10: Human Checkpoints
**Goal**: Checkpoint system and human review flow
**Depends on**: Phase 4
**Research**: Unlikely
**Plans**: TBD

Key deliverables:
- 5 mandatory checkpoints (Foundation, Persistence, Single Agent, Multi-Agent, MVP)
- Review request and approval flow
- Escalation handling
- Checkpoint UI integration

### Phase 11: Integration & Testing
**Goal**: End-to-end integration and comprehensive testing
**Depends on**: Phases 5-10
**Research**: Unlikely
**Plans**: TBD

Key deliverables:
- End-to-end integration tests
- Performance testing
- Error boundary and recovery
- Cross-platform validation

### Phase 12: Polish
**Goal**: Final polish and production readiness
**Depends on**: Phase 11
**Research**: Unlikely (Framer Motion patterns)
**Plans**: TBD

Key deliverables:
- Settings page with configuration
- Framer Motion animations
- Final bug fixes
- Documentation
- Release preparation

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 8/8 | Complete | 2026-01-14 |
| 2. Persistence | 3/3 | Complete | 2026-01-14 |
| 3. LLM & Agents | 3/3 | Complete | 2026-01-14 |
| 4. Orchestration | 3/3 | Complete | 2026-01-14 |
| 5. UI Foundation | 5/5 | Complete | 2026-01-15 |
| 6. Interview UI | 4/4 | Complete | 2026-01-15 |
| 7. Kanban UI | 4/4 | Complete | 2026-01-15 |
| 8. Dashboard UI | 0/TBD | Not started | - |
| 9. Interview Engine | 0/TBD | Not started | - |
| 10. Human Checkpoints | 0/TBD | Not started | - |
| 11. Integration & Testing | 0/TBD | Not started | - |
| 12. Polish | 0/TBD | Not started | - |
