# Phase 2: Persistence - Context

**Gathered:** 2026-01-14
**Status:** Ready for execution

<vision>
## How This Should Work

The persistence layer is a **transparent safety net**. Users can see checkpoints and state, giving them confidence to experiment knowing they can always roll back.

Two parts working together:
1. **Visual checkpoint timeline** — users browse and restore from checkpoints in the UI
2. **Human-readable STATE.md** — a file they can inspect, share, or even edit manually

The system remembers everything. Whether you step away for 5 minutes or 5 days, you pick up exactly where you left off. The `.continue-here.md` captures mid-task state so even interrupted work can resume seamlessly.

**The feel:**
- **State saves:** Fast and quiet. StateManager auto-saves continuously in background. Never blocks agents or user interaction. Silent unless there's an error.
- **Checkpoints:** Explicit confirmations. When CheckpointManager creates a checkpoint, emit `CHECKPOINT_CREATED` event. Dashboard shows toast notification "Checkpoint saved". Users see it appear in the timeline. Gives confidence the safety net is working.

Regular saves are invisible. Milestone checkpoints are celebrated.

</vision>

<essential>
## What Must Be Nailed

- **Never lose work** — Rock-solid checkpoints and recovery. If anything crashes or goes wrong, users can always recover. This is the non-negotiable core.
- **Lossless roundtrip** — STATE.md export/import must be perfectly reversible. No data loss on conversion.
- **Git state in checkpoints** — Checkpoints include commit hash, branch, dirty files. Full context for restoration.

</essential>

<boundaries>
## What's Out of Scope

- **Cloud sync/backup** — Everything stays local for now. No remote storage.
- **User-facing UI** — Building services only. Dashboard comes in Phase 11.
- **Real-time collaboration** — Single-user focus. Multi-user features deferred.

</boundaries>

<specifics>
## Specific Ideas

**From Master Book Section 4.3:**

### BUILD-005: State Management
- StateManager: `saveState`, `loadState`, `updateState`, `exportSTATE_MD`, `importSTATE_MD`
- NexusState: currentPhase, currentFeature, currentTask, progress, activeTasks, activeAgents, tasksCompleted, totalTasks, timeElapsed, estimatedRemaining, recentDecisions, lastError, errorCount
- ContinuePoint: `saveContinuePoint()`, `loadContinuePoint()`, `clearContinuePoint()` for .continue-here.md
- CheckpointManager: `createCheckpoint`, `restoreCheckpoint`, `listCheckpoints`, `deleteCheckpoint`
- StateFormatAdapter: `toMarkdown`, `fromMarkdown` with lossless roundtrip

### BUILD-006: Memory System
- MemorySystem: `storeEpisode`, `queryMemory`, `getRelevantContext`, `pruneOldEpisodes`
- Episode types: code_generation, error_fix, review_feedback, decision, pattern, gotcha, optimization
- EmbeddingsService: OpenAI text-embedding-3-small (NOT ada-002)
- Local cache for computed embeddings
- SQLite vector search with cosine similarity in application layer
- Graceful fallback if API unavailable

### BUILD-007: Requirements Database
- RequirementsDB: `createProject`, `addRequirement`, `getRequirements`, `updateRequirement`, `deleteRequirement`, `categorizeRequirements`, `searchRequirements`
- MoSCoW prioritization: must, should, could, wont
- Categories: functional, non-functional, constraint, assumption
- Includes source tracking (interview question that led to requirement)

### File Structure
```
src/persistence/
├── state/StateManager.ts (200-250 LOC)
├── checkpoints/CheckpointManager.ts (250-300 LOC)
├── memory/
│   ├── MemorySystem.ts (300-350 LOC)
│   └── EmbeddingsService.ts (150-200 LOC)
├── requirements/RequirementsDB.ts (200-250 LOC)
src/adapters/
└── StateFormatAdapter.ts (150-200 LOC)
```

</specifics>

<notes>
## Additional Context

**Test expectations:**
- BUILD-005: ~35 tests
- BUILD-006: ~23 tests
- BUILD-007: ~12 tests
- Total: ~70 tests
- Coverage: ≥85% for persistence layer

**Verification criteria (Sprint 2 Milestone):**
- State save/load works reliably
- STATE.md export/import roundtrip is lossless
- Checkpoints create and restore correctly (including git state)
- Memory queries return relevant results (cosine similarity > 0.7)
- Requirements persist and search works

**Key decisions to make during implementation:**
- SQLite vector search approach (JSON array storage, app-layer similarity)
- Embedding caching strategy
- Auto-save interval (default 30s per Master Book)

</notes>

---

*Phase: 02-persistence*
*Context gathered: 2026-01-14*
