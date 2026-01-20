# Phase 4: Orchestration - Context

**Gathered:** 2026-01-14
**Status:** Ready for planning

<vision>
## How This Should Work

Phase 4 is where Nexus becomes autonomous. The orchestration system coordinates multiple AI agents working in parallel on decomposed tasks.

**Wave-based execution flow:**
1. TaskDecomposer breaks features into ≤30-min atomic tasks using AI (Opus 4.5)
2. DependencyResolver calculates parallel waves using Kahn's algorithm
3. NexusCoordinator processes waves sequentially, with up to 4 agents per wave
4. Each task runs in an isolated git worktree
5. Task passes QA → IMMEDIATE merge to main → cleanup worktree
6. After ALL wave tasks complete → CREATE CHECKPOINT (human review point)
7. Start next wave

**Per-task merge, per-wave checkpoint:**
- Merging happens continuously (as each task passes QA)
- Checkpoints happen at wave boundaries (logical recovery points)
- Wave 2 tasks can depend on Wave 1 outputs (they see merged changes)

**Genesis vs Evolution modes:**
- Genesis: Decompose requirements → full build from scratch
- Evolution: Analyze existing code → targeted changes
- NexusCoordinator handles both modes with mode-specific orchestration paths

</vision>

<essential>
## What Must Be Nailed

- **Correct wave calculation** - Dependencies resolved correctly, no cycles slip through, parallel-safe grouping. If this is wrong, everything downstream breaks.
- **30-minute task limit** - HARD LIMIT enforced by TaskDecomposer. Auto-split if bigger.
- **Per-task merge flow** - Immediate merge after QA passes so later tasks see changes
- **Graceful degradation** - One stuck task should NEVER block independent tasks

</essential>

<boundaries>
## What's Out of Scope

- **UI components** - No dashboard, no visual progress (Phase 5+)
- **Human checkpoint APPROVAL UI** - Checkpoints created but no approval flow UI
- **Interview Engine** - Requirement gathering is Phase 5+
- **Kanban/Dashboard views** - Phase 5+

**IN SCOPE:**
- Genesis/Evolution mode LOGIC in NexusCoordinator
- Checkpoint CREATION (CheckpointManager already built in Phase 2)
- Mode-specific orchestration flow

</boundaries>

<specifics>
## Specific Implementation Details

**BUILD-011: Planning Layer (20h)**

| Component | Interface | Tests |
|-----------|-----------|-------|
| TaskDecomposer | decompose(), validateTaskSize(), splitTask() | ~12 |
| DependencyResolver | resolve(), topologicalSort(), detectCycles(), calculateWaves() | ~15 |
| TimeEstimator | estimateTime(), calibrate() | ~8 |
| TaskSchemaAdapter | GSD XML ↔ Nexus Task conversion | ~5 |

Task sizing:
- Atomic: 5-15 min (single file)
- Small: 15-30 min (1-2 files)
- MAX: 30 min (auto-split if bigger)

Libraries: `graphlib` for graph algorithms

**BUILD-012: Orchestration Layer (28h)**

| Component | Interface | Tests |
|-----------|-----------|-------|
| NexusCoordinator | orchestrate(), executeTask(), Genesis/Evolution modes | ~20 |
| AgentPool | spawn(), getAvailable(), release(), max 4 agents | ~12 |
| TaskQueue | enqueue(), dequeue(), wave-aware scheduling | ~10 |
| EventBus | emit(), on(), off(), once(), onAny() | ~8 |
| AgentWorktreeBridge | assignWorktree(), releaseWorktree() | ~6 |
| PlanningExecutionBridge | planToTasks(), taskToExecution() | ~6 |

Libraries: `p-queue` for queue, `EventEmitter3` for events

**Event-driven status:**
- Use all 48 event types from src/types/events.ts
- Key events: TASK_*, AGENT_*, WAVE_*, QA_ITERATION_*, CHECKPOINT_*

**Graceful degradation:**
- Agent fails → release agent, return task to queue, try different agent
- Task escalated (50 iterations) → mark 'escalated', continue other tasks
- Agent pool auto-recovers (respawn if agent crashes)

**Progress tracking:**
- Per-task: status, iterations, time elapsed
- Per-wave: tasks complete/total, estimated remaining
- Per-project: overall %, ETA, token usage, cost

**Error recovery:**
- Save state before each task execution
- On crash, resume from last checkpoint
- Use ContinuePoint for mid-task recovery

</specifics>

<notes>
## Additional Context

**NexusCoordinator main loop:**
```typescript
async orchestrate(project: Project): Promise<void> {
  const tasks = await this.taskDecomposer.decompose(project.features);
  const waves = await this.dependencyResolver.calculateWaves(tasks);

  for (const wave of waves) {
    for (const task of wave.tasks) await this.taskQueue.enqueue(task);

    while (!this.isWaveComplete(wave)) {
      const agent = await this.agentPool.getAvailable();
      if (!agent) { await this.wait(1000); continue; }
      const task = await this.taskQueue.dequeue();
      if (task) await this.executeTask(agent, task);
    }

    await this.checkpointManager.createCheckpoint(`Wave ${wave.id} complete`);
  }
}
```

**Sprint 4 Success Criteria:**
- Task decomposition produces valid ≤30-min tasks
- Dependency resolution detects cycles
- Wave calculation groups parallel-safe tasks
- Agent pool manages 4 concurrent agents
- Task queue respects dependencies
- Events flow correctly through EventBus
- Full execution flow works with multiple agents
- Coverage ≥ 80% for orchestration layer

**Integration Test (MILESTONE-4):**
- Decompose feature into tasks (all ≤30 min)
- Calculate parallel waves (first wave has no dependencies)
- Orchestrate multi-agent execution (all tasks complete)

**Total expected tests:** ~110 (40 planning + 62 orchestration + 8 adapters)

</notes>

---

*Phase: 04-orchestration*
*Context gathered: 2026-01-14*
