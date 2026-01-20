# Phase 5: UI Foundation - Context

**Gathered:** 2026-01-15
**Status:** Ready for planning

<vision>
## How This Should Work

When you open Nexus, you're greeted with two bold, inviting cards — "Genesis" (start fresh) and "Evolution" (continue building). This is the first moment, and it should feel like a clear choice, not a form to fill out.

The aesthetic is Cursor-style: modern, AI-native, dark with accent colors. Conversational elements front and center. This isn't enterprise software — it's a tool that feels alive, like it's ready to build with you.

Behind the scenes, everything is wired up properly: Electron IPC working, Zustand stores connected, routing clean. The scaffold is rock-solid so Phases 6-8 can build on it without fighting the foundation.

</vision>

<essential>
## What Must Be Nailed

- **Solid scaffold** — Electron main/renderer IPC working flawlessly, React + Vite + shadcn/ui set up correctly, Zustand stores wired and tested. This is the foundation everything builds on.
- **Mode selection experience** — Two bold cards for Genesis/Evolution that feel inviting, not like a dropdown menu.
- **UIBackendBridge working** — UI must talk to the orchestration layer (NexusCoordinator, EventBus) reliably.

</essential>

<boundaries>
## What's Out of Scope

- **Page content** — Interview UI (Phase 6), Kanban UI (Phase 7), Dashboard UI (Phase 8) are separate phases. Just build the shell and routing.
- **Animations and polish** — Skip Framer Motion, transitions, micro-interactions. Functional first, polish comes in Phase 12.
- **Complex theming** — Dark mode is the default, no light mode toggle needed yet.

</boundaries>

<specifics>
## Specific Ideas

- **Cursor-style aesthetic** — Dark theme, AI-native feel, accent colors. Not Linear's minimalism, not VS Code's density. Modern and alive.
- **Two bold mode cards** — Full visual impact for the Genesis/Evolution choice. Think large, prominent, inviting.
- **Follow BUILD-013 spec** — Master Book Section 4.6 defines the structure:
  - Electron main process (window management, IPC, lifecycle)
  - React 19 + Vite + shadcn/ui + Tailwind
  - 4 Zustand stores: projectStore, taskStore, agentStore, uiStore
  - UIBackendBridge connecting to NexusCoordinator
  - Routing: Genesis → Interview → Dashboard, Evolution → Kanban → Dashboard
- **~32 tests expected** — 8 projectStore, 8 taskStore, 6 agentStore, 10 bridge

</specifics>

<notes>
## Additional Context

This phase completes Sprint 5 foundation (BUILD-013). The remaining BUILD items (014-016) are Phases 6-8.

File structure from Master Book:
```
src/main/
└── main.ts (Electron main process)
src/ui/
├── pages/
├── components/
├── stores/
│   ├── projectStore.ts
│   ├── taskStore.ts
│   ├── agentStore.ts
│   └── uiStore.ts
└── App.tsx (routing)
src/bridges/
└── UIBackendBridge.ts
```

Tech stack: Electron 28+, React 19, Vite, Tailwind CSS, shadcn/ui, Zustand

</notes>

---

*Phase: 05-ui-foundation*
*Context gathered: 2026-01-15*
