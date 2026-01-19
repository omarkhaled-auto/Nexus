# Feature to UI Mapping

> Phase 17 Research Task R7: Create Feature-to-UI Mapping
> Generated: Phase 17 UI Redesign

This document provides the master mapping of ALL backend features to their required UI elements, identifying gaps between current UI and available backend capabilities.

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Interview & Requirements Module](#interview--requirements-module)
3. [Planning & Decomposition Module](#planning--decomposition-module)
4. [Orchestration Module](#orchestration-module)
5. [Agent Pool Module](#agent-pool-module)
6. [Execution & QA Module](#execution--qa-module)
7. [Persistence Module](#persistence-module)
8. [LLM Provider Module](#llm-provider-module)
9. [Settings & Configuration Module](#settings--configuration-module)
10. [Infrastructure Module](#infrastructure-module)
11. [Priority Matrix](#priority-matrix)
12. [Implementation Roadmap](#implementation-roadmap)

---

## Executive Summary

### Coverage Statistics

| Category | Backend Features | Currently Exposed | Gap |
|----------|-----------------|-------------------|-----|
| Interview | 15 | 8 (53%) | 7 features |
| Planning | 12 | 3 (25%) | 9 features |
| Orchestration | 10 | 2 (20%) | 8 features |
| Agent Pool | 8 | 4 (50%) | 4 features |
| Execution/QA | 14 | 0 (0%) | 14 features |
| Persistence | 12 | 3 (25%) | 9 features |
| LLM Provider | 8 | 2 (25%) | 6 features |
| Settings | 25 | 12 (48%) | 13 features |
| Infrastructure | 6 | 0 (0%) | 6 features |
| **TOTAL** | **110** | **34 (31%)** | **76 features** |

### Critical Gaps (Must Fix)

1. **No Agents Page** - Cannot monitor agent activity or live output
2. **No Execution Page** - Cannot view build/lint/test/review results
3. **Settings Incomplete** - Missing model dropdowns, backend toggles, per-agent config
4. **No Real-time Updates** - UI doesn't subscribe to EventBus
5. **No QA Status Display** - Cannot see QA pipeline status

---

## Interview & Requirements Module

### Service: InterviewEngine

| Backend Feature | Method | Current UI | Required UI | Priority | Page |
|-----------------|--------|------------|-------------|----------|------|
| Start interview session | `startSession()` | New Interview button | Keep, enhance with project selection | MEDIUM | Interview |
| Process user messages | `processMessage()` | Chat input + AI response | Keep, add typing indicator | LOW | Interview |
| Extract requirements | `processMessage()` returns requirements | RequirementCard display | Keep, add inline editing | MEDIUM | Interview |
| Get session by ID | `getSession()` | Session recovery banner | Keep | LOW | Interview |
| End/complete session | `endSession()` | Complete button | Keep, add confirmation | LOW | Interview |
| Pause session | `pauseSession()` | **MISSING** | Add pause button with status | MEDIUM | Interview |
| Resume session | `resumeSession()` | Resume banner | Keep, enhance visibility | LOW | Interview |
| Initial greeting | `getInitialGreeting()` | Auto-displayed | Keep | LOW | Interview |

### Service: QuestionGenerator

| Backend Feature | Method | Current UI | Required UI | Priority | Page |
|-----------------|--------|------------|-------------|----------|------|
| Generate follow-up questions | `generate()` | **MISSING** | Show suggested questions as clickable chips | HIGH | Interview |
| Detect coverage gaps | `detectGaps()` | **MISSING** | Display unexplored areas with suggestions | HIGH | Interview |
| Gap suggestion threshold | `shouldSuggestGap()` | **MISSING** | Auto-surface gaps when threshold met | MEDIUM | Interview |

### Service: RequirementExtractor

| Backend Feature | Method | Current UI | Required UI | Priority | Page |
|-----------------|--------|------------|-------------|----------|------|
| Confidence threshold | `setConfidenceThreshold()` | **MISSING** | Slider in Interview settings | LOW | Settings |
| Extraction stats | `extract()` returns counts | **MISSING** | Show raw vs filtered counts | LOW | Interview |

### Service: InterviewSessionManager

| Backend Feature | Method | Current UI | Required UI | Priority | Page |
|-----------------|--------|------------|-------------|----------|------|
| Auto-save | `startAutoSave()` | Auto-save indicator | Keep, show last saved time | LOW | Interview |
| Export to requirements DB | `exportToRequirementsDB()` | **MISSING** | Export button with count confirmation | MEDIUM | Interview |

---

## Planning & Decomposition Module

### Service: TaskDecomposer

| Backend Feature | Method | Current UI | Required UI | Priority | Page |
|-----------------|--------|------------|-------------|----------|------|
| Decompose feature to tasks | `decompose()` | **MISSING** | Task tree visualization with expand/collapse | HIGH | Tasks |
| Validate task size | `validateTaskSize()` | **MISSING** | Warning icons on oversized tasks | MEDIUM | Tasks |
| Split oversized tasks | `splitTask()` | **MISSING** | Split action button on task cards | MEDIUM | Tasks |
| Estimate task time | `estimateTime()` | Time shown on cards | Keep, add estimation breakdown tooltip | LOW | Tasks |

### Service: TimeEstimator

| Backend Feature | Method | Current UI | Required UI | Priority | Page |
|-----------------|--------|------------|-------------|----------|------|
| Estimate total project time | `estimateTotal()` | **MISSING** | Total time display in project header | HIGH | Tasks |
| Detailed estimation breakdown | `estimateDetailed()` | **MISSING** | Tooltip showing base/files/complexity/tests | MEDIUM | Tasks |
| Estimation accuracy metrics | `getAccuracy()` | **MISSING** | Metrics in Dashboard | LOW | Dashboard |
| Calibrate estimates | `calibrate()` | **MISSING** | Auto-calibrate on task completion | LOW | Backend |

### Service: DependencyResolver

| Backend Feature | Method | Current UI | Required UI | Priority | Page |
|-----------------|--------|------------|-------------|----------|------|
| Calculate execution waves | `calculateWaves()` | **MISSING** | Wave visualization/swimlanes | HIGH | Tasks |
| Topological sort | `topologicalSort()` | **MISSING** | Sort tasks by execution order | MEDIUM | Tasks |
| Detect circular dependencies | `detectCycles()` | **MISSING** | Error display with cycle path | HIGH | Tasks |
| Critical path | `getCriticalPath()` | **MISSING** | Highlight critical path tasks | MEDIUM | Tasks |
| Next available tasks | `getNextAvailable()` | **MISSING** | "Ready" indicator on tasks | MEDIUM | Tasks |

---

## Orchestration Module

### Service: NexusCoordinator

| Backend Feature | Method | Current UI | Required UI | Priority | Page |
|-----------------|--------|------------|-------------|----------|------|
| Start orchestration | `start()` | **MISSING** | Start button with project selection | HIGH | Dashboard |
| Pause orchestration | `pause()` | **MISSING** | Pause button (creates checkpoint) | HIGH | Dashboard |
| Resume orchestration | `resume()` | **MISSING** | Resume button with checkpoint info | HIGH | Dashboard |
| Stop orchestration | `stop()` | **MISSING** | Stop button with confirmation | HIGH | Dashboard |
| Get status | `getStatus()` | Basic status in Dashboard | Enhance with phase/state details | HIGH | Dashboard |
| Get progress | `getProgress()` | ProgressChart | Keep, add completed/failed/total breakdown | MEDIUM | Dashboard |
| Subscribe to events | `on()` | **PARTIAL** | Connect all UI components to EventBus | HIGH | All |

### Service: HumanReviewService

| Backend Feature | Method | Current UI | Required UI | Priority | Page |
|-----------------|--------|------------|-------------|----------|------|
| List pending reviews | `getPendingReviews()` | **MISSING** | Notification badge + review queue | HIGH | Dashboard/Agents |
| Approve review | `approve()` | **MISSING** | Approve button with optional comment | HIGH | Review Modal |
| Reject review | `reject()` | **MISSING** | Reject button with required comment | HIGH | Review Modal |
| Review context display | `getReview()` | **MISSING** | Show reason, task, diff, and context | HIGH | Review Modal |

---

## Agent Pool Module

### Service: AgentPool

| Backend Feature | Method | Current UI | Required UI | Priority | Page |
|-----------------|--------|------------|-------------|----------|------|
| Get pool status | `getStatus()` | AgentActivity (Dashboard) | Enhance with utilization metrics | MEDIUM | Dashboard/Agents |
| List available agents | `getAvailableAgents()` | **MISSING** | Idle agents section on Agents page | HIGH | Agents |
| Get agent by ID | `getAgent()` | Click on AgentActivity row | Keep, enhance with full details panel | MEDIUM | Agents |
| Spawn agent | `spawn()` | **MISSING** | Auto (backend), show spawn event in timeline | LOW | Agents |
| Assign task to agent | `assign()` | **MISSING** | Show assignment in timeline + agent card | HIGH | Agents |
| Release agent | `release()` | **MISSING** | Show release event in timeline | LOW | Agents |
| Terminate agent | `terminate()` | **MISSING** | Manual terminate button (admin) | LOW | Agents |

### Agent Activity (Real-time)

| Backend Feature | Event/Source | Current UI | Required UI | Priority | Page |
|-----------------|--------------|------------|-------------|----------|------|
| Agent status changes | `agent:spawned`, `agent:assigned`, etc. | Basic in AgentActivity | Full agent cards with status | HIGH | Agents |
| Agent live output | Streaming from BaseAgentRunner | **MISSING** | Live output panel for selected agent | HIGH | Agents |
| Agent iteration count | RalphStyleIterator | **MISSING** | Progress bar with iteration X/50 | HIGH | Agents |
| Agent current file | Agent context | **MISSING** | File being worked on | MEDIUM | Agents |
| Agent error display | `agent:error` event | **MISSING** | Error message with stack trace | HIGH | Agents |

---

## Execution & QA Module

### Service: QARunnerFactory / QA Pipeline

| Backend Feature | Event/Source | Current UI | Required UI | Priority | Page |
|-----------------|--------------|------------|-------------|----------|------|
| Build status | `qa:build:completed` | **MISSING** | Build status card with output | HIGH | Execution |
| Build output | BuildRunner output | **MISSING** | Syntax-highlighted code block | HIGH | Execution |
| Lint status | `qa:lint:completed` | **MISSING** | Lint status card with issue count | HIGH | Execution |
| Lint output | LintRunner output | **MISSING** | Issue list with file:line links | HIGH | Execution |
| Test status | `qa:test:completed` | **MISSING** | Test status card with pass/fail count | HIGH | Execution |
| Test output | TestRunner output | **MISSING** | Test results with failure details | HIGH | Execution |
| Review status | `qa:review:completed` | **MISSING** | Review status card | HIGH | Execution |
| Review feedback | ReviewRunner output | **MISSING** | Review comments display | HIGH | Execution |
| QA loop iteration | `qa:loop:completed` | **MISSING** | Iteration badge on task cards | HIGH | Tasks/Agents |
| QA pipeline tabs | All runners | **MISSING** | Tab navigation: Build/Lint/Test/Review | HIGH | Execution |
| Clear logs | N/A | **MISSING** | Clear logs button per tab | LOW | Execution |
| Log streaming | Real-time events | **MISSING** | Auto-scroll with pause option | MEDIUM | Execution |
| Expandable sections | N/A | **MISSING** | Collapse/expand log sections | LOW | Execution |
| Syntax highlighting | N/A | **MISSING** | Highlight code in logs | MEDIUM | Execution |

---

## Persistence Module

### Service: RequirementsDB

| Backend Feature | Method | Current UI | Required UI | Priority | Page |
|-----------------|--------|------------|-------------|----------|------|
| View requirements | `getRequirementsByProject()` | RequirementsSidebar | Keep, add filters | MEDIUM | Interview |
| Edit requirement | `updateRequirement()` | **MISSING** | Inline edit on RequirementCard | MEDIUM | Interview |
| Delete requirement | `deleteRequirement()` | **MISSING** | Delete button with confirmation | LOW | Interview |
| Filter by category | `getRequirementsByProject(options)` | Category sections | Add category filter dropdown | LOW | Interview |
| Filter by priority | `getRequirementsByProject(options)` | **MISSING** | Priority filter dropdown | LOW | Interview |
| Validate requirement | `validateRequirement()` | **MISSING** | Checkbox to mark as validated | LOW | Interview |

### Service: MemorySystem

| Backend Feature | Method | Current UI | Required UI | Priority | Page |
|-----------------|--------|------------|-------------|----------|------|
| Search similar episodes | `search()` | **MISSING** | Memory search panel | MEDIUM | Memory |
| View episode details | `getEpisode()` | **MISSING** | Episode card with context | MEDIUM | Memory |
| Episode importance | Episode.importance | **MISSING** | Importance indicator on cards | LOW | Memory |
| Prune old episodes | `pruneOldEpisodes()` | **MISSING** | Manual prune button (admin) | LOW | Memory |

### Service: CheckpointManager

| Backend Feature | Method | Current UI | Required UI | Priority | Page |
|-----------------|--------|------------|-------------|----------|------|
| Create checkpoint | `createCheckpoint()` | Auto (backend) | Manual create button | MEDIUM | Checkpoints |
| List checkpoints | `listCheckpoints()` | CheckpointList | Keep, enhance with metadata | MEDIUM | Settings/Dashboard |
| Restore checkpoint | `restore()` | ReviewModal | Keep, add confirmation | HIGH | Checkpoints |
| Delete checkpoint | `deleteCheckpoint()` | **MISSING** | Delete button per checkpoint | LOW | Checkpoints |
| Checkpoint metadata | Checkpoint type | **MISSING** | Show trigger, size, timestamp | MEDIUM | Checkpoints |

---

## LLM Provider Module

### Service: LLMProvider

| Backend Feature | Method | Current UI | Required UI | Priority | Page |
|-----------------|--------|------------|-------------|----------|------|
| Get usage stats | `getUsageStats()` | CostTracker (partial) | Full breakdown by agent type | MEDIUM | Dashboard |
| Reset usage stats | `resetUsageStats()` | **MISSING** | Reset button in Dashboard | LOW | Dashboard |
| Current LLM display | N/A | **MISSING** | Show which LLM is active | MEDIUM | Dashboard/Agents |
| Token usage per request | LLMResponse.usage | **MISSING** | Per-task token count | LOW | Tasks |
| Cost per operation | Calculated from usage | CostTracker | Keep, add per-task cost | LOW | Dashboard |
| Stream response | `stream()` | **MISSING** | Show streaming text in agent output | HIGH | Agents |

### Model Selection (from models.ts)

| Backend Feature | Source | Current UI | Required UI | Priority | Page |
|-----------------|--------|------------|-------------|----------|------|
| Claude models list | `getClaudeModelList()` | Text input | Dropdown with all 5 models | HIGH | Settings |
| Gemini models list | `getGeminiModelList()` | Text input | Dropdown with all 5 models | HIGH | Settings |
| Embedding models list | `getLocalEmbeddingModelList()` | Text input | Dropdown with all 4 local + 3 OpenAI | HIGH | Settings |
| Model descriptions | Model.description | **MISSING** | Show description below dropdown | MEDIUM | Settings |
| Model validation | `isValidClaudeModel()`, etc. | **MISSING** | Validate on input, show error | MEDIUM | Settings |

---

## Settings & Configuration Module

### LLM Settings

| Backend Feature | Setting Path | Current UI | Required UI | Priority | Page |
|-----------------|--------------|------------|-------------|----------|------|
| Claude backend toggle | `llm.claude.backend` | **MISSING** | CLI/API radio buttons | HIGH | Settings |
| Claude CLI detection | CLI availability check | **MISSING** | Status indicator (detected/not found) | HIGH | Settings |
| Claude model dropdown | `llm.claude.model` | Text input | Dropdown with descriptions | HIGH | Settings |
| Claude API key | `llm.claude.apiKeyEncrypted` | API key input | Keep, only show for API mode | MEDIUM | Settings |
| Claude timeout | `llm.claude.timeout` | **MISSING** | Input in Advanced section | LOW | Settings |
| Claude max retries | `llm.claude.maxRetries` | **MISSING** | Input in Advanced section | LOW | Settings |
| Gemini backend toggle | `llm.gemini.backend` | **MISSING** | CLI/API radio buttons | HIGH | Settings |
| Gemini CLI detection | CLI availability check | **MISSING** | Status indicator | HIGH | Settings |
| Gemini model dropdown | `llm.gemini.model` | Text input | Dropdown with descriptions | HIGH | Settings |
| Gemini API key | `llm.gemini.apiKeyEncrypted` | API key input | Keep, only show for API mode | MEDIUM | Settings |
| Embeddings backend toggle | `llm.embeddings.backend` | **MISSING** | Local/API radio buttons | HIGH | Settings |
| Embeddings model dropdown | `llm.embeddings.localModel` | Text input | Dropdown for local models | HIGH | Settings |
| Default provider | `llm.defaultProvider` | Radio buttons | Keep | LOW | Settings |
| Fallback enabled | `llm.fallbackEnabled` | Checkbox | Keep | LOW | Settings |

### Agent Settings

| Backend Feature | Setting Path | Current UI | Required UI | Priority | Page |
|-----------------|--------------|------------|-------------|----------|------|
| Per-agent model config | Agent role assignments | **MISSING** | Table: Agent/Provider/Model | HIGH | Settings |
| Max parallel agents | `agents.maxParallelAgents` | Number input | Keep, add range validation | LOW | Settings |
| Task timeout | `agents.taskTimeoutMinutes` | Number input | Keep | LOW | Settings |
| Max retries | `agents.maxRetries` | Number input | Keep | LOW | Settings |
| Auto retry | `agents.autoRetryEnabled` | Checkbox | Keep | LOW | Settings |
| "Use Recommended Defaults" | NEXUS_AGENT_MODELS | **MISSING** | Button to reset to defaults | MEDIUM | Settings |

### Checkpoint Settings

| Backend Feature | Setting Path | Current UI | Required UI | Priority | Page |
|-----------------|--------------|------------|-------------|----------|------|
| Auto-checkpoint enabled | `checkpoints.autoCheckpointEnabled` | Checkbox | Keep | LOW | Settings |
| Auto-checkpoint interval | `checkpoints.autoCheckpointIntervalMinutes` | Number input | Keep, add slider | LOW | Settings |
| Max checkpoints | `checkpoints.maxCheckpointsToKeep` | Number input | Keep | LOW | Settings |
| Checkpoint on feature complete | `checkpoints.checkpointOnFeatureComplete` | Checkbox | Keep | LOW | Settings |

### UI Settings

| Backend Feature | Setting Path | Current UI | Required UI | Priority | Page |
|-----------------|--------------|------------|-------------|----------|------|
| Theme | `ui.theme` | Select (3 options) | Keep | LOW | Settings |
| Sidebar width | `ui.sidebarWidth` | Number input | Add slider with preview | LOW | Settings |
| Notifications | `ui.showNotifications` | Checkbox | Keep | LOW | Settings |
| Notification duration | `ui.notificationDuration` | **MISSING** | Slider (1-30 seconds) | LOW | Settings |

---

## Infrastructure Module

### Service: GitService

| Backend Feature | Method | Current UI | Required UI | Priority | Page |
|-----------------|--------|------------|-------------|----------|------|
| Git status | `getStatus()` | **MISSING** | Branch + status in project header | MEDIUM | Dashboard |
| Current branch | `getStatus().branch` | **MISSING** | Branch indicator | MEDIUM | Dashboard |
| Commit history | `getCommits()` | **MISSING** | Recent commits in project overview | LOW | Dashboard |
| View diff | `getDiff()` | **MISSING** | Diff viewer in code review | MEDIUM | Execution |

### Service: RepoMapGenerator

| Backend Feature | Method | Current UI | Required UI | Priority | Page |
|-----------------|--------|------------|-------------|----------|------|
| Repository map | `generate()` | **MISSING** | File tree with symbols | MEDIUM | Memory |
| File symbols | `getSymbols()` | **MISSING** | Symbol list per file | LOW | Memory |
| Dependencies | `getDependencies()` | **MISSING** | Import/export graph | LOW | Memory |
| Repo stats | `getStats()` | **MISSING** | Codebase metrics cards | LOW | Memory |

---

## Priority Matrix

### Priority Definitions

- **HIGH**: Critical for core functionality, blocks user workflows
- **MEDIUM**: Enhances experience significantly, recommended for v1
- **LOW**: Nice to have, can defer to v2

### HIGH Priority Features (Must Have)

| Feature | Current State | Target Page | Effort |
|---------|---------------|-------------|--------|
| Agents Page (new) | None | Agents | Large |
| Agent live output | None | Agents | Medium |
| Agent iteration count | None | Agents | Small |
| Agent status cards | Basic | Agents | Medium |
| Execution Page (new) | None | Execution | Large |
| Build/Lint/Test/Review tabs | None | Execution | Medium |
| QA output display | None | Execution | Medium |
| Syntax highlighting | None | Execution | Small |
| Model dropdowns (all providers) | Text inputs | Settings | Medium |
| Backend toggles (CLI/API) | None | Settings | Medium |
| Per-agent model config | None | Settings | Medium |
| Start/Pause/Resume/Stop controls | None | Dashboard | Medium |
| Pending reviews queue | None | Dashboard | Medium |
| Review approve/reject | None | Modal | Medium |
| EventBus connection | Partial | All | Large |
| Detect coverage gaps | None | Interview | Small |
| Suggested questions | None | Interview | Medium |
| Dependency cycle detection | None | Tasks | Small |
| Execution waves display | None | Tasks | Medium |
| Task tree visualization | None | Tasks | Medium |

### MEDIUM Priority Features (Should Have)

| Feature | Current State | Target Page | Effort |
|---------|---------------|-------------|--------|
| Pause interview session | None | Interview | Small |
| Export requirements | None | Interview | Small |
| Edit requirement inline | None | Interview | Medium |
| Estimation breakdown tooltip | None | Tasks | Small |
| Total project time | None | Tasks | Small |
| Critical path highlight | None | Tasks | Medium |
| Checkpoint timeline | Basic | Settings | Medium |
| Checkpoint metadata | None | Settings | Small |
| Usage stats by agent | Partial | Dashboard | Medium |
| Git branch indicator | None | Dashboard | Small |
| Memory/Context page | None | Memory | Large |
| Repo map tree | None | Memory | Medium |
| Memory search | None | Memory | Medium |

### LOW Priority Features (Nice to Have)

| Feature | Current State | Target Page | Effort |
|---------|---------------|-------------|--------|
| Confidence threshold slider | None | Settings | Small |
| Extraction stats | None | Interview | Small |
| Estimation accuracy metrics | None | Dashboard | Small |
| Commit history | None | Dashboard | Small |
| Dependency graph | None | Memory | Large |
| Episode importance | None | Memory | Small |
| Prune episodes button | None | Memory | Small |
| Reset usage stats | None | Dashboard | Small |
| Per-task token count | None | Tasks | Small |
| Notification duration slider | None | Settings | Small |

---

## Implementation Roadmap

### Phase 17B: Foundation (Tasks 8-12)
Build design system and base components needed for all pages.

**Components to create:**
- Toggle (for CLI/API switches)
- CodeBlock (for execution logs)
- AgentBadge (for agent status)
- StatusCard (for QA status)
- ModelDropdown (for model selection)

### Phase 17C: Core Pages (Tasks 13-23)

**Task Order:**
1. Navigation + App Shell redesign
2. Dashboard Page (add orchestration controls)
3. **TEST Dashboard**
4. Interview Page (add suggestions, gaps)
5. **TEST Interview**
6. Tasks Page (add waves, dependencies)
7. **TEST Tasks**
8. **Agents Page (NEW)** - Critical gap
9. **TEST Agents**
10. **Execution Page (NEW)** - Critical gap
11. **TEST Execution**

### Phase 17D: Settings & Polish (Tasks 24-31)

**Task Order:**
1. Settings - LLM Providers tab (model dropdowns, backend toggles)
2. Settings - Agents tab (per-agent config table)
3. Settings - Checkpoints tab (timeline, metadata)
4. Settings - UI Preferences tab (minor)
5. **TEST Settings (all tabs)**
6. Animations and micro-interactions
7. Responsive design
8. **TEST responsive**

### Phase 17E: Integration (Tasks 32-36)

**Task Order:**
1. Connect all pages to real data
2. Wire up EventBus subscriptions
3. Test real-time updates
4. Full Playwright test suite
5. Visual regression testing
6. Documentation and test report

---

## Summary

### Key Takeaways

1. **Only 31% of backend features are exposed in UI** - Significant opportunity to surface power
2. **Two critical new pages needed**: Agents and Execution
3. **Settings page needs major overhaul** for model/backend configuration
4. **Real-time updates are key** - EventBus integration is fundamental
5. **Interview and Tasks pages need enhancement** but have good foundations

### Success Metrics

- [ ] 100% of HIGH priority features implemented
- [ ] 80%+ of MEDIUM priority features implemented
- [ ] All new pages tested with Playwright
- [ ] All EventBus events connected to UI
- [ ] All model dropdowns populated
- [ ] All backend toggles working
- [ ] Per-agent configuration working
