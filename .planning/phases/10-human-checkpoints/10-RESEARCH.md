# Phase 10: Human Checkpoints - Research

**Researched:** 2026-01-16
**Domain:** State checkpointing, human-in-the-loop review, git integration
**Confidence:** HIGH

<research_summary>
## Summary

Phase 10 builds on established patterns already in the codebase. The CheckpointManager (src/persistence/checkpoints/CheckpointManager.ts) already exists with create, restore, list, and delete operations. The EventBus has checkpoint events defined. This phase enhances the existing infrastructure with:

1. **HumanReviewService** - New component for managing review requests when QA escalates
2. **CheckpointScheduler** - New component for time-based and event-triggered auto-checkpoints
3. **UI integration** - Modal reviews and checkpoint history display

The HITL (Human-in-the-Loop) pattern research confirms the gate-based approval approach is industry standard for agentic systems. Key insight: Use decorator/wrapper patterns to instrument high-risk operations, maintain audit trails, and support async approval workflows.

**Primary recommendation:** Build HumanReviewService with review queue + IPC notification to renderer. CheckpointScheduler handles timing. Use existing CheckpointManager and EventBus patterns.
</research_summary>

<standard_stack>
## Standard Stack

### Core (Already in Codebase)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| better-sqlite3 | ^11.0.0 | Synchronous SQLite | Fast, WAL mode, already used |
| drizzle-orm | ^0.37.0 | Type-safe ORM | Already used, transaction support |
| simple-git (git-js) | ^3.x | Git operations | Promise-based, branch/commit/checkout |
| uuid | ^11.0.0 | Checkpoint IDs | Already used for entity IDs |

### Supporting (Already Available)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| EventBus | internal | Event pub/sub | Emit checkpoint/review events |
| StateManager | internal | State persistence | Save/load NexusState |
| GitService | internal | Git wrapper | Already wraps simple-git |

### Nothing New to Install
All required dependencies are already in the codebase. Phase 10 creates new services using existing infrastructure.

</standard_stack>

<architecture_patterns>
## Architecture Patterns

### Existing Codebase Structure
```
src/
├── persistence/
│   ├── checkpoints/
│   │   ├── CheckpointManager.ts     # EXISTS - enhance with EventBus integration
│   │   └── CheckpointScheduler.ts   # NEW - auto-checkpoint triggers
│   └── database/
│       └── schema.ts                # checkpoints table EXISTS
├── orchestration/
│   ├── events/
│   │   └── EventBus.ts              # EXISTS - checkpoint events defined
│   └── review/
│       └── HumanReviewService.ts    # NEW - review queue management
├── main/
│   └── ipc/
│       └── handlers.ts              # Add checkpoint/review IPC handlers
└── renderer/
    └── src/
        ├── components/
        │   └── checkpoints/          # NEW - CheckpointList, ReviewModal
        └── hooks/
            └── useCheckpoint.ts      # NEW - checkpoint operations hook
```

### Pattern 1: Gate-Based Approval (HITL)
**What:** Agent execution pauses at checkpoint until human approves
**When to use:** QA exhausted, before risky operations, scheduled intervals
**Source:** [Human-in-the-Loop Approval Framework](https://github.com/nibzard/awesome-agentic-patterns/blob/main/patterns/human-in-loop-approval-framework.md)

```typescript
// HumanReviewService pattern
class HumanReviewService {
  private pendingReviews: Map<string, HumanReviewRequest> = new Map();
  private eventBus: EventBus;

  async requestReview(request: HumanReviewRequest): Promise<void> {
    // 1. Store in pending
    this.pendingReviews.set(request.id, request);

    // 2. Create safety checkpoint
    await this.checkpointManager.createCheckpoint(
      request.projectId,
      `Pre-review: ${request.reason}`
    );

    // 3. Emit event for UI notification
    this.eventBus.emit('review:requested', { request });
  }

  async approveReview(reviewId: string, resolution?: string): Promise<void> {
    const review = this.pendingReviews.get(reviewId);
    if (!review) throw new ReviewNotFoundError(reviewId);

    review.status = 'approved';
    review.resolvedAt = new Date();
    review.resolution = resolution;

    this.pendingReviews.delete(reviewId);
    this.eventBus.emit('review:approved', { reviewId, resolution });
  }

  async rejectReview(reviewId: string, feedback: string): Promise<void> {
    const review = this.pendingReviews.get(reviewId);
    if (!review) throw new ReviewNotFoundError(reviewId);

    review.status = 'rejected';
    review.resolvedAt = new Date();
    review.resolution = feedback;

    this.pendingReviews.delete(reviewId);
    this.eventBus.emit('review:rejected', { reviewId, feedback });

    // Rollback to pre-review checkpoint if needed
  }
}
```

### Pattern 2: Scheduled Checkpoints
**What:** Time-based or event-based automatic checkpoint creation
**When to use:** Periodic safety snapshots, after feature completion
**Source:** [Checkpoint/Restore Systems for AI Agents](https://eunomia.dev/blog/2025/05/11/checkpointrestore-systems-evolution-techniques-and-applications-in-ai-agents/)

```typescript
class CheckpointScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private config: CheckpointConfig;
  private checkpointManager: CheckpointManager;
  private eventBus: EventBus;

  start(projectId: string): void {
    // Time-based checkpoint
    this.intervalId = setInterval(
      () => this.createScheduledCheckpoint(projectId, 'scheduled'),
      this.config.autoCheckpointInterval
    );

    // Event-based checkpoints
    this.eventBus.on('feature:completed', (event) => {
      if (this.config.checkpointOnFeatureComplete) {
        this.createScheduledCheckpoint(projectId, 'feature_complete');
      }
    });

    this.eventBus.on('task:escalated', (event) => {
      // QA exhausted - create checkpoint + request review
      this.createScheduledCheckpoint(projectId, 'qa_exhausted');
      this.humanReviewService.requestReview({
        taskId: event.payload.taskId,
        reason: 'qa_exhausted',
        context: { iterations: event.payload.iterations }
      });
    });
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}
```

### Pattern 3: IPC for Renderer Communication
**What:** Expose checkpoint/review APIs to renderer process
**When to use:** All UI interactions with checkpoint system
**Source:** Existing codebase pattern (src/main/ipc/handlers.ts)

```typescript
// In main/ipc/handlers.ts
ipcMain.handle('checkpoint:list', async (_, projectId: string) => {
  return checkpointManager.listCheckpoints(projectId);
});

ipcMain.handle('checkpoint:restore', async (_, checkpointId: string) => {
  await checkpointManager.restoreCheckpoint(checkpointId);
});

ipcMain.handle('review:approve', async (_, reviewId: string, resolution?: string) => {
  await humanReviewService.approveReview(reviewId, resolution);
});

ipcMain.handle('review:reject', async (_, reviewId: string, feedback: string) => {
  await humanReviewService.rejectReview(reviewId, feedback);
});
```

### Anti-Patterns to Avoid
- **No blocking in main process:** Review approval must be async with IPC notification
- **No orphan checkpoints:** Always prune old checkpoints to prevent disk bloat
- **No git operations on UI thread:** All git operations via GitService in main process
- **No approval fatigue:** Only critical operations trigger human review (QA exhausted, not every checkpoint)
</architecture_patterns>

<dont_hand_roll>
## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Git operations | Custom spawn/exec | simple-git (GitService) | Already wrapped, handles edge cases |
| State serialization | Manual JSON | StateManager.loadState/saveState | Handles file paths, validation |
| Event dispatch | Custom pub/sub | EventBus singleton | Type-safe, already integrated |
| Database transactions | Raw SQL | Drizzle ORM transactions | Type-safe, already configured |
| Unique IDs | Custom generators | uuid v4 | Already used throughout codebase |
| Interval management | Custom timers | setInterval with cleanup | Standard, but ensure cleanup on stop |

**Key insight:** Phase 10 creates orchestration over existing primitives. The CheckpointManager, GitService, StateManager, EventBus, and DatabaseClient already exist and handle the hard parts. This phase wires them together with HumanReviewService and CheckpointScheduler.
</dont_hand_roll>

<common_pitfalls>
## Common Pitfalls

### Pitfall 1: Review Queue Lost on Restart
**What goes wrong:** Pending reviews disappear if app crashes
**Why it happens:** Reviews stored only in memory
**How to avoid:** Persist pending reviews to database (reviews table or sessions table with JSON)
**Warning signs:** Reviews disappear after restart, users lose context

### Pitfall 2: Checkpoint Starvation in WAL Mode
**What goes wrong:** WAL file grows indefinitely during sustained reads
**Why it happens:** SQLite WAL checkpoints can't complete if readers hold locks
**How to avoid:** Use `db.pragma('wal_checkpoint(RESTART)')` periodically
**Warning signs:** .db-wal file grows very large (>100MB)
**Source:** [better-sqlite3 performance docs](https://github.com/WiseLibs/better-sqlite3/blob/master/docs/performance.md)

### Pitfall 3: Git Branch Proliferation
**What goes wrong:** Hundreds of checkpoint branches pollute repo
**Why it happens:** Creating branch per checkpoint without cleanup
**How to avoid:** Use tags instead of branches for checkpoints, or prune old branches
**Warning signs:** `git branch` shows hundreds of entries

### Pitfall 4: Blocking Main Process with Git
**What goes wrong:** UI freezes during checkpoint creation
**Why it happens:** Git operations are async but can take time on large repos
**How to avoid:** Show loading state, use background task pattern
**Warning signs:** UI unresponsive when checkpoint triggers

### Pitfall 5: Approval Fatigue
**What goes wrong:** Users rubber-stamp reviews without looking
**Why it happens:** Too many review requests, low-value checkpoints trigger reviews
**How to avoid:** Only QA exhausted triggers review, not time-based checkpoints
**Warning signs:** Reviews approved in <1 second consistently
**Source:** [HITL Best Practices](https://www.permit.io/blog/human-in-the-loop-for-ai-agents-best-practices-frameworks-use-cases-and-demo)
</common_pitfalls>

<code_examples>
## Code Examples

### Drizzle Transaction for Checkpoint + Review
```typescript
// Source: Drizzle ORM docs + codebase pattern
import { eq } from 'drizzle-orm';

async function createCheckpointWithReview(
  db: DatabaseClient,
  checkpoint: NewCheckpoint,
  review: NewHumanReviewRequest
): Promise<void> {
  await db.db.transaction(async (tx) => {
    // Insert checkpoint
    tx.insert(checkpoints).values(checkpoint).run();

    // Insert review request
    tx.insert(humanReviews).values(review).run();
  });
}
```

### EventBus Integration for Review Events
```typescript
// Source: Existing EventBus pattern (src/orchestration/events/EventBus.ts)
// New events to add to types/events.ts

// Add to EventType union:
| 'review:requested'
| 'review:approved'
| 'review:rejected'

// Add payload interfaces:
export interface ReviewRequestedPayload {
  request: HumanReviewRequest;
}

export interface ReviewApprovedPayload {
  reviewId: string;
  resolution?: string;
}

export interface ReviewRejectedPayload {
  reviewId: string;
  feedback: string;
}
```

### WAL Checkpoint Maintenance
```typescript
// Source: better-sqlite3 docs
import fs from 'fs';

function setupWalMaintenance(dbPath: string, db: DatabaseClient): void {
  const walPath = `${dbPath}-wal`;
  const maxWalSize = 100 * 1024 * 1024; // 100MB

  setInterval(() => {
    fs.stat(walPath, (err, stat) => {
      if (err) {
        if (err.code !== 'ENOENT') throw err;
        return;
      }
      if (stat.size > maxWalSize) {
        db.db.pragma('wal_checkpoint(RESTART)');
      }
    });
  }, 30000).unref(); // Check every 30 seconds
}
```

### IPC Handler Pattern
```typescript
// Source: Existing pattern (src/main/ipc/handlers.ts)
import { ipcMain } from 'electron';

export function registerCheckpointHandlers(
  checkpointManager: CheckpointManager,
  humanReviewService: HumanReviewService
): void {
  ipcMain.handle('checkpoint:list', async (_, projectId: string) => {
    return checkpointManager.listCheckpoints(projectId);
  });

  ipcMain.handle('checkpoint:create', async (_, projectId: string, reason: string) => {
    return checkpointManager.createCheckpoint(projectId, reason);
  });

  ipcMain.handle('checkpoint:restore', async (_, checkpointId: string) => {
    await checkpointManager.restoreCheckpoint(checkpointId, { restoreGit: true });
  });

  ipcMain.handle('review:list', async () => {
    return humanReviewService.listPendingReviews();
  });

  ipcMain.handle('review:approve', async (_, reviewId: string, resolution?: string) => {
    await humanReviewService.approveReview(reviewId, resolution);
  });

  ipcMain.handle('review:reject', async (_, reviewId: string, feedback: string) => {
    await humanReviewService.rejectReview(reviewId, feedback);
  });
}
```
</code_examples>

<sota_updates>
## State of the Art (2025-2026)

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual checkpoints only | Auto-checkpoint + human review gates | 2024-2025 | Agentic systems need both automatic safety nets and human approval for high-risk ops |
| Block all risky operations | Risk classification + async approval | 2025 | Better balance between automation and safety |
| In-memory review state | Persistent review queue | 2025 | Crash recovery, audit trail |

**New patterns to consider:**
- **Thin-agent with reversible actions:** Agents execute scoped toolchains where changes are reversible, with checkpoints for sensitive steps
- **Bounded autonomy:** Clear limits with checkpoints, escalation paths, and manual overrides
- **Episodic memory:** Agents learn from past review decisions (future enhancement)

**Current best practices from research:**
- [Zapier HITL patterns](https://zapier.com/blog/human-in-the-loop/): Pre-execution input, mid-execution approval, async feedback loops
- [LangChain HITL docs](https://docs.langchain.com/oss/python/langchain/human-in-the-loop): Interrupt pattern for graph-based workflows
- [AWS Bedrock confirmation](https://aws.amazon.com/blogs/machine-learning/implement-human-in-the-loop-confirmation-with-amazon-bedrock-agents/): User confirmation and return of control

**Deprecated/outdated:**
- Blocking every operation for review (causes approval fatigue)
- No fallback strategy when approval is denied
</sota_updates>

<open_questions>
## Open Questions

1. **Review persistence location**
   - What we know: Reviews need persistence for crash recovery
   - What's unclear: New `human_reviews` table vs. reuse `sessions` table with JSON
   - Recommendation: Use `sessions` table with type='review' and JSON data (simpler, consistent with InterviewSessionManager pattern)

2. **Checkpoint pruning strategy**
   - What we know: maxCheckpoints default is 50
   - What's unclear: Should pruning happen on create or on schedule?
   - Recommendation: Prune on create (keep N most recent), simpler than scheduled job

3. **Git tag vs branch for checkpoints**
   - What we know: Branches can proliferate, tags are lighter
   - What's unclear: Whether to use annotated tags or lightweight tags
   - Recommendation: Use annotated tags with checkpoint metadata (searchable, informative)
</open_questions>

<sources>
## Sources

### Primary (HIGH confidence)
- `/steveukx/git-js` Context7 - branch, commit, checkout operations
- `/wiselibs/better-sqlite3` Context7 - WAL mode, checkpoint pragma
- `/drizzle-team/drizzle-orm-docs` Context7 - transactions, upsert patterns
- Existing codebase: CheckpointManager.ts, EventBus.ts, StateManager.ts

### Secondary (MEDIUM confidence)
- [Human-in-the-Loop Approval Framework](https://github.com/nibzard/awesome-agentic-patterns/blob/main/patterns/human-in-loop-approval-framework.md) - verified against LangChain docs
- [Checkpoint/Restore for AI Agents](https://eunomia.dev/blog/2025/05/11/checkpointrestore-systems-evolution-techniques-and-applications-in-ai-agents/) - verified core concepts
- [HITL Best Practices](https://www.permit.io/blog/human-in-the-loop-for-ai-agents-best-practices-frameworks-use-cases-and-demo) - verified patterns

### Tertiary (LOW confidence - validated during implementation)
- Microsoft Agent Framework checkpoint patterns (referenced but not deeply verified)
- AWS Bedrock AgentCore Memory (enterprise solution, not directly applicable)
</sources>

<metadata>
## Metadata

**Research scope:**
- Core technology: SQLite/Drizzle for persistence, simple-git for version control
- Ecosystem: EventBus for events, IPC for renderer communication
- Patterns: HITL approval gates, scheduled checkpoints, review queue
- Pitfalls: WAL starvation, git branch proliferation, approval fatigue

**Confidence breakdown:**
- Standard stack: HIGH - already in codebase, no new dependencies
- Architecture: HIGH - follows existing patterns (InterviewSessionManager, EventBus)
- Pitfalls: MEDIUM - some from research, some from codebase analysis
- Code examples: HIGH - from Context7 and existing codebase

**Research date:** 2026-01-16
**Valid until:** 2026-02-16 (30 days - stable patterns, no fast-moving dependencies)
</metadata>

---

*Phase: 10-human-checkpoints*
*Research completed: 2026-01-16*
*Ready for planning: yes*
