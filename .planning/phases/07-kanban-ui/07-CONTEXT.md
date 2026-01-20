# Phase 7: Kanban UI - Context

**Gathered:** 2026-01-15
**Status:** Ready for planning

<vision>
## How This Should Work

When users enter Evolution mode, they land on a Kanban board that feels like Linear — clean, minimal, and focused. The board shows features flowing through a 6-column pipeline: Backlog → Planning → In Progress → AI Review → Human Review → Done.

The key differentiator is seeing AI at work. When an agent is working on a feature, you see exactly what it's doing: "Running tests", "Fixing lint", "Awaiting review". This isn't just a project board — it's a window into the AI development process.

Dragging a card doesn't just change status — it triggers real actions. Drag to Planning and the TaskDecomposer breaks it into tasks. Drag to In Progress and an agent picks it up. The board is the control surface for the entire Evolution workflow.

The feel should be calm and focused — no visual clutter, just what matters. And fast — every drag feels instant with optimistic updates.

</vision>

<essential>
## What Must Be Nailed

- **AI status integration** — Show what the agent is actively doing on each card. "Running tests", "Fixing lint", "Code review". This is what makes Nexus different from Trello.
- **Drag triggers actions** — Moving cards isn't just status updates. Drag to planning = decomposition. Drag to in_progress = agent execution. The board controls the backend.
- **Calm & responsive** — Linear-style minimalism. Fast feedback on every action. Optimistic updates with revert on error.

</essential>

<boundaries>
## What's Out of Scope

- **Custom columns** — Fixed 6-column pipeline. No adding/removing/renaming columns. That's future work.
- **Keyboard shortcuts** — Mouse-first for now. Keyboard navigation comes in Phase 12 (Polish).
- **Advanced filtering** — Basic search is fine, but no saved filters or complex queries.
- **Feature creation UI** — Features come from Genesis mode or manual entry. No inline creation in Kanban.

</boundaries>

<specifics>
## Specific Ideas

- **Complexity badges** — Show S/M/L/XL (or simple/moderate/complex) so you see task weight at a glance
- **Column counts** — Show how many items in each column: "In Progress (2/3)" with WIP limit visible
- **6-column layout** — Backlog, Planning, In Progress (WIP: 3), AI Review, Human Review, Done
- **@dnd-kit** — Use @dnd-kit library for drag-and-drop (PointerSensor + KeyboardSensor)
- **Progress on cards** — Show percentage complete and assigned agent with status indicator
- **FeatureDetailModal** — Click to expand card into modal with task list, agent activity, timeline
- **Priority colors** — Critical (red), High (orange), Medium (yellow), Low (gray)

</specifics>

<notes>
## Additional Context

**From BUILD-015 specification:**
- Components: KanbanPage, KanbanBoard, KanbanColumn, FeatureCard, FeatureDetailModal, KanbanHeader, TaskList
- ~45 tests required across components
- Events: FEATURE_CREATED, FEATURE_STATUS_CHANGED, FEATURE_COMPLETED via EventBus
- Connects to: taskStore, EventBus, UIBackendBridge, NexusCoordinator

**Drag action mappings:**
- backlog → planning: Triggers TaskDecomposer
- planning → in_progress: Triggers agent execution
- in_progress → ai_review: Automatic after code complete
- ai_review → in_progress: QA failed, back to agent
- ai_review → human_review: QA passed
- human_review → done: Human approved, merge
- human_review → in_progress: Human requested changes

</notes>

---

*Phase: 07-kanban-ui*
*Context gathered: 2026-01-15*
