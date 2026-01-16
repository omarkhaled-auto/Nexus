# Phase 10: Human Checkpoints - Context

**Gathered:** 2026-01-16
**Status:** Ready for planning

<vision>
## How This Should Work

Gate-based checkpoints that pause agent execution at critical milestones. When agents hit a checkpoint, everything stops until a human reviews and approves. The checkpoint appears as a modal that demands attention — you can't just dismiss it or work around it.

The review experience adapts to the checkpoint type. Routine checkpoints (time-based, feature completion) get quick verification — glance at a summary, click approve, agents continue. Critical checkpoints (MVP review, QA exhausted) get deep inspection — drill into code diffs, test results, agent logs before making a decision.

CheckpointManager is the hero component. It creates state snapshots that include project status, completed/pending tasks, agent states, and metrics. Each checkpoint gets a git branch and commit so you can always trace back to that exact point in the codebase.

Human review kicks in when QA escalates (50 iterations without success). The system creates a safety checkpoint, notifies the UI, and waits. The human can approve to continue, reject to rollback, or provide guidance.

</vision>

<essential>
## What Must Be Nailed

- **Blocking enforcement** — Agents cannot proceed past checkpoints without human approval. No way to skip or bypass. This is the safety guarantee.
- **State snapshots with git integration** — Every checkpoint captures full NexusState plus creates a git branch/commit. Recovery means restoring both application state AND codebase state.
- **QA escalation flow** — When QALoopEngine exhausts 50 iterations, it triggers human review automatically. This is the last line of defense before giving up.

</essential>

<boundaries>
## What's Out of Scope

- **Custom checkpoint creation** — Only predefined triggers work (time-based, feature completion, risky ops, QA exhaustion, manual request). Users cannot add their own checkpoint types.
- **Auto-approval rules** — No "if tests pass, auto-approve" logic. Humans must click approve for every checkpoint. Automation comes in future phases.
- **Detailed rollback system** — Rejection pauses execution but doesn't auto-fix or intelligently revert changes. Simple restore-from-checkpoint is the mechanism.
- **Full workflow orchestration** — Phase 11 handles integration. This phase builds the checkpoint primitives.

</boundaries>

<specifics>
## Specific Ideas

**Core Components:**
- CheckpointManager (250-300 LOC) — Create/restore snapshots, git integration, auto-triggers, pruning
- HumanReviewService (150-200 LOC) — Review queue, approval/rejection flow, UI notifications
- CheckpointScheduler (100-150 LOC) — Time-based (2 hours), feature completion, pre-risky-op triggers
- UI: CheckpointList component + useCheckpoint hook

**Checkpoint Triggers:**
| Trigger | Type | Description |
|---------|------|-------------|
| Time-based | Auto | Every 2 hours of active work |
| Feature completion | Auto | After each feature is done |
| Before risky operation | Auto | Before merges, large refactors |
| QA exhausted (50 iterations) | Auto | Create checkpoint + request review |
| User request | Manual | User clicks "Create Checkpoint" |

**Modal-based reviews** — Checkpoints appear as modals that pause everything until you decide. Quick verify for routine, deep inspection for critical.

**Events:**
- checkpoint.created, checkpoint.restored, checkpoint.deleted
- review.requested, review.approved, review.rejected, qa.escalated

**Human Review Flow:**
```
QA Loop exhausted (50 iterations)
│
▼
1. QALoopEngine emits 'qa.escalated'
2. HumanReviewService creates review request
3. CheckpointManager creates safety checkpoint
4. UI notified via 'review.requested'
5. Human reviews in UI, approves/rejects
6. System resumes or rollback to checkpoint
```

</specifics>

<notes>
## Additional Context

**What Already Exists:**
- Phase 2: DatabaseClient with checkpoints table schema (already defined)
- Phase 4: EventBus with checkpoint events defined
- Phase 8: Dashboard showing checkpoint info
- Phase 9: InterviewSessionManager (similar persistence pattern to follow)

**Database Schema (from Phase 2):**
```typescript
export const checkpoints = sqliteTable('checkpoints', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id),
  label: text('label'),
  state: text('state', { mode: 'json' }).notNull(), // NexusState
  gitBranch: text('git_branch'),
  gitCommit: text('git_commit'),
  size: integer('size').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});
```

**Key Interfaces:**
- Checkpoint: id, projectId, label, state (NexusState), gitBranch, gitCommit, createdAt, size
- CheckpointConfig: autoCheckpointInterval (2h), maxCheckpoints (50), checkpointOnFeatureComplete, checkpointBeforeRiskyOps
- HumanReviewRequest: id, taskId, reason (qa_exhausted | merge_conflict | manual_request), context, status, timestamps
- NexusState: projectStatus, completedTasks, pendingTasks, agentStates, metrics

**Integration Points:**
- GitService: Create branch/commit for each checkpoint
- StateManager: Get current state for snapshot
- EventBus: Emit checkpoint events
- QALoopEngine: Trigger review on exhaustion
- MergeManager: Checkpoint before risky merges
- UI Dashboard: Display checkpoint history

**Tests Expected:** ~35-40
- CheckpointManager: ~15 tests
- HumanReviewService: ~10 tests
- CheckpointScheduler: ~8 tests
- IPC/UI integration: ~5 tests

</notes>

---

*Phase: 10-human-checkpoints*
*Context gathered: 2026-01-16*
