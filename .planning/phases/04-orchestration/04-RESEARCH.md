# Phase 4: Orchestration - Research

**Researched:** 2026-01-14
**Domain:** Task orchestration, dependency graphs, multi-agent coordination
**Confidence:** HIGH

<research_summary>
## Summary

Researched the JavaScript/TypeScript ecosystem for building a task orchestration system with dependency resolution, multi-agent coordination, and event-driven communication.

The domain is well-established with mature libraries. The core components use standard CS algorithms (Kahn's topological sort for wave calculation) and proven patterns (worker pools, event emitters, priority queues). The libraries specified in CONTEXT.md (`graphlib`, `p-queue`, `eventemitter3`) are valid choices but there are alternatives worth considering.

Key finding: This is a commodity domain - don't over-engineer. The complexity lies in coordinating these components correctly, not in building novel algorithms. The graphlib library provides battle-tested implementations of topological sort and cycle detection. Custom implementations would be wasted effort.

**Primary recommendation:** Use `@dagrejs/graphlib` for dependency resolution (has topsort + cycle detection built-in), `p-queue` for task scheduling with priority and concurrency control, and Node's built-in `EventEmitter` with `typed-emitter` for type safety (zero runtime overhead). For agent pooling, implement a simple custom pool since agent state management is domain-specific.
</research_summary>

<standard_stack>
## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @dagrejs/graphlib | 2.2.x | Graph data structures, topological sort, cycle detection | 1.9M weekly downloads, battle-tested, official topsort + isAcyclic + findCycles |
| p-queue | 8.x | Promise queue with concurrency control | 92 benchmark score, priority support, setPriority for dynamic reordering |
| typed-emitter | 2.x | Type-safe EventEmitter wrapper | Zero bytes runtime, adds TS types to Node EventEmitter |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| nanoid | 5.x | ID generation | Already in project, lightweight, URL-safe |
| events (Node built-in) | - | Base EventEmitter | Default event emitter, typed-emitter wraps this |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| graphlib | graphology | Graphology more features but graphlib sufficient for DAG ops |
| p-queue | workerpool | Workerpool for CPU-heavy threads, p-queue for async coordination |
| typed-emitter | eventemitter3 | EE3 faster but typed-emitter adds zero bytes and full type safety |
| typed-emitter | nanoevents | Nanoevents smaller but less feature-complete for complex systems |

**Installation:**
```bash
pnpm add @dagrejs/graphlib p-queue typed-emitter
pnpm add -D @types/node
```
</standard_stack>

<architecture_patterns>
## Architecture Patterns

### Recommended Project Structure
```
src/
├── planning/
│   ├── decomposition/     # TaskDecomposer
│   ├── dependencies/      # DependencyResolver (uses graphlib)
│   ├── estimation/        # TimeEstimator
│   └── types.ts           # Planning layer types
├── orchestration/
│   ├── coordinator/       # NexusCoordinator main loop
│   ├── agents/            # AgentPool management
│   ├── queue/             # TaskQueue (uses p-queue)
│   └── events/            # EventBus (typed events)
└── bridges/
    ├── AgentWorktreeBridge.ts
    └── PlanningExecutionBridge.ts
```

### Pattern 1: Wave-Based Execution
**What:** Group tasks by dependency level, execute waves sequentially, parallelize within waves
**When to use:** Multi-agent systems with dependencies between tasks
**Example:**
```typescript
// Using graphlib for wave calculation
import { Graph, alg } from '@dagrejs/graphlib';

function calculateWaves(tasks: Task[]): Wave[] {
  const g = new Graph();

  // Add nodes and edges
  for (const task of tasks) {
    g.setNode(task.id, task);
    for (const dep of task.dependsOn) {
      g.setEdge(dep, task.id);
    }
  }

  // Check for cycles first
  if (!alg.isAcyclic(g)) {
    throw new CycleError(alg.findCycles(g));
  }

  // Calculate waves using BFS levels from roots
  const waves: Wave[] = [];
  const levels = new Map<string, number>();
  const sorted = alg.topsort(g);

  for (const nodeId of sorted) {
    const deps = g.predecessors(nodeId) || [];
    const level = deps.length === 0
      ? 0
      : Math.max(...deps.map(d => levels.get(d)!)) + 1;
    levels.set(nodeId, level);
  }

  // Group by level
  for (const [taskId, level] of levels) {
    if (!waves[level]) waves[level] = { id: level, tasks: [] };
    waves[level].tasks.push(g.node(taskId));
  }

  return waves;
}
```

### Pattern 2: Agent Pool with Semaphore
**What:** Limit concurrent agent execution using a semaphore pattern
**When to use:** When you need bounded parallelism with agent state tracking
**Example:**
```typescript
import PQueue from 'p-queue';

class AgentPool {
  private agents = new Map<string, Agent>();
  private maxAgents = 4;

  async getAvailable(): Promise<Agent | null> {
    for (const [id, agent] of this.agents) {
      if (agent.state === 'idle') {
        return agent;
      }
    }
    return null;
  }

  async spawn(type: AgentType): Promise<Agent> {
    if (this.agents.size >= this.maxAgents) {
      throw new Error('Agent pool at capacity');
    }
    const agent = new Agent(type);
    this.agents.set(agent.id, agent);
    return agent;
  }

  release(agentId: string): void {
    const agent = this.agents.get(agentId);
    if (agent) agent.state = 'idle';
  }
}
```

### Pattern 3: Typed Event Bus
**What:** Type-safe event emitter for cross-layer communication
**When to use:** When multiple components need decoupled communication
**Example:**
```typescript
import { EventEmitter } from 'events';
import TypedEmitter from 'typed-emitter';

// Define event map
type OrchestratorEvents = {
  'task:started': (task: Task) => void;
  'task:completed': (task: Task, result: TaskResult) => void;
  'task:failed': (task: Task, error: Error) => void;
  'wave:completed': (wave: Wave) => void;
  'agent:assigned': (agent: Agent, task: Task) => void;
};

// Create typed emitter
const eventBus = new EventEmitter() as TypedEmitter<OrchestratorEvents>;

// Type-safe usage
eventBus.on('task:completed', (task, result) => {
  console.log(`Task ${task.id} completed with status ${result.status}`);
});

eventBus.emit('task:completed', task, { status: 'success' });
```

### Anti-Patterns to Avoid
- **Hand-rolling topological sort:** graphlib's `alg.topsort()` handles edge cases correctly
- **Unbounded parallelism:** Always use p-queue or semaphore to limit concurrent agents
- **Polling for task completion:** Use events instead of polling loops
- **Tight coupling between orchestration and agents:** Use event bus for loose coupling
- **Ignoring cycle detection:** Always check `isAcyclic()` before attempting wave calculation
</architecture_patterns>

<dont_hand_roll>
## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Topological sort | Custom DFS implementation | graphlib `alg.topsort()` | Edge cases: disconnected components, multi-edge handling |
| Cycle detection | Custom visited set tracking | graphlib `alg.findCycles()` | Returns all cycles, not just first found |
| Priority queue | Custom heap implementation | p-queue | Priority + concurrency + timeout + cancelation |
| Event typing | Manual type assertions | typed-emitter | Zero runtime cost, full type inference |
| ID generation | Custom UUID code | nanoid/crypto.randomUUID | Collision-resistant, URL-safe |

**Key insight:** Graph algorithms and concurrent task management have decades of research. The standard libraries implement optimized versions with proper handling of edge cases (disconnected graphs, self-loops, multi-edges). Custom implementations will have bugs that only surface in production with complex dependency graphs.
</dont_hand_roll>

<common_pitfalls>
## Common Pitfalls

### Pitfall 1: Not Checking for Cycles Before Wave Calculation
**What goes wrong:** Wave calculation assumes DAG, infinite loops if cycles exist
**Why it happens:** Assuming user-provided dependencies are always valid
**How to avoid:** Always call `alg.isAcyclic(g)` before `alg.topsort(g)`
**Warning signs:** Orchestrator hangs during planning phase

### Pitfall 2: Agent Starvation
**What goes wrong:** Some agents never get tasks, others overloaded
**Why it happens:** Poor task assignment without round-robin or load balancing
**How to avoid:** Use `getAvailable()` that checks all agents fairly, not just first found
**Warning signs:** Uneven agent utilization in metrics, some agents always idle

### Pitfall 3: Race Conditions in Task State
**What goes wrong:** Task marked complete before merge, dependent tasks start with stale code
**Why it happens:** Async operations not properly awaited
**How to avoid:** Ensure atomic state transitions: `executing → qa → merged → complete`
**Warning signs:** Dependent tasks fail with "file not found" errors

### Pitfall 4: Deadlock from Circular Waits
**What goes wrong:** Agent A waits for Agent B's task, Agent B waits for Agent A
**Why it happens:** Hidden dependencies not captured in task graph
**How to avoid:** All dependencies must be in the graph, no implicit waiting between agents
**Warning signs:** Orchestrator stuck with all agents "waiting"

### Pitfall 5: Memory Leaks from Event Listeners
**What goes wrong:** Memory grows unbounded over long orchestration runs
**Why it happens:** `on()` listeners not removed after task/wave completion
**How to avoid:** Use `once()` for single-fire events, always call unsubscribe functions
**Warning signs:** Memory usage grows linearly with tasks processed

### Pitfall 6: Over-Automation Without Checkpoints
**What goes wrong:** 100 tasks complete before human notices critical error in task 5
**Why it happens:** No human review points between waves
**How to avoid:** Create checkpoint at every wave boundary, require approval for next wave
**Warning signs:** Cascading failures, massive rollbacks needed
</common_pitfalls>

<code_examples>
## Code Examples

Verified patterns from official sources:

### Graphlib Topological Sort with Cycle Detection
```typescript
// Source: https://context7.com/dagrejs/graphlib
import { Graph, alg } from '@dagrejs/graphlib';

const g = new Graph();
g.setEdge('task-1', 'task-2');
g.setEdge('task-1', 'task-3');
g.setEdge('task-2', 'task-4');
g.setEdge('task-3', 'task-4');

// Check for cycles first
if (alg.isAcyclic(g)) {
  const order = alg.topsort(g);
  // ['task-1', 'task-2', 'task-3', 'task-4'] or similar valid order
} else {
  const cycles = alg.findCycles(g);
  // Handle cycles - report to user, reject plan
}
```

### p-queue Priority Task Scheduling
```typescript
// Source: https://github.com/sindresorhus/p-queue
import PQueue from 'p-queue';

const queue = new PQueue({ concurrency: 4 });

// Add task with priority (higher = runs first)
queue.add(async () => executeTask(task1), { priority: 0, id: 'task-1' });
queue.add(async () => executeTask(task2), { priority: 10, id: 'task-2' }); // runs first

// Dynamic priority update
queue.setPriority('task-1', 20); // now task-1 runs next

// Wait for all tasks
await queue.onIdle();
```

### Typed EventEmitter Pattern
```typescript
// Source: https://github.com/andywer/typed-emitter
import { EventEmitter } from 'events';
import TypedEmitter from 'typed-emitter';

interface Events {
  'task:started': (taskId: string) => void;
  'task:completed': (taskId: string, duration: number) => void;
  'error': (error: Error) => void;
}

const emitter = new EventEmitter() as TypedEmitter<Events>;

// Fully type-safe
emitter.on('task:completed', (taskId, duration) => {
  // taskId: string, duration: number - inferred correctly
});
```
</code_examples>

<sota_updates>
## State of the Art (2025-2026)

What's changed recently:

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| eventemitter3 | typed-emitter + Node EventEmitter | 2023+ | Zero runtime cost with full type safety |
| graphlib (original) | @dagrejs/graphlib | 2022 | Maintained fork with TypeScript support |
| Custom priority queues | p-queue 8.x | 2024 | setPriority, better timeout handling |
| Worker pools for I/O | Async coordination | Ongoing | Workers for CPU, async for I/O |

**New tools/patterns to consider:**
- **AWS Agent Squad:** TypeScript framework for multi-agent orchestration with intent classification
- **Mastra:** TypeScript-native agent framework with suspend-resume and OpenTelemetry tracing
- **Orchestrator-Worker pattern:** Explicit pattern name for coordinator + specialized agents

**Deprecated/outdated:**
- **graphlib (non-dagrejs):** Original package no longer maintained, use @dagrejs/graphlib
- **eventemitter3 alone:** Use typed-emitter wrapper for type safety without runtime cost
- **Manual promise coordination:** Use p-queue instead of custom Promise.all with batching
</sota_updates>

<open_questions>
## Open Questions

Things that couldn't be fully resolved:

1. **Agent respawn strategy**
   - What we know: Agents can fail, need recovery mechanism
   - What's unclear: Optimal respawn delay and retry limits
   - Recommendation: Start with 3 retries, 1s backoff, tune based on testing

2. **Task timeout values**
   - What we know: 30-minute hard limit per CONTEXT.md
   - What's unclear: Should timeout be per-task or include QA iterations?
   - Recommendation: 30 min per task execution, QA iterations within that budget

3. **Wave checkpoint granularity**
   - What we know: Checkpoints at wave boundaries per CONTEXT.md
   - What's unclear: Should large waves (10+ tasks) have mid-wave checkpoints?
   - Recommendation: Start with wave-boundary only, add mid-wave if needed
</open_questions>

<sources>
## Sources

### Primary (HIGH confidence)
- [/dagrejs/graphlib](https://github.com/dagrejs/graphlib) - topological sort, cycle detection, graph algorithms
- [/sindresorhus/p-queue](https://github.com/sindresorhus/p-queue) - priority queue with concurrency control
- [typed-emitter](https://github.com/andywer/typed-emitter) - type-safe EventEmitter wrapper

### Secondary (MEDIUM confidence)
- [Orchestrator-Worker Agents comparison](https://arize.com/blog/orchestrator-worker-agents-a-practical-comparison-of-common-agent-frameworks/) - multi-agent patterns
- [AWS Agent Squad](https://github.com/awslabs/agent-squad) - TypeScript agent orchestration framework
- [Workflow orchestration pitfalls](https://avatu.in/blogs/5-common-workflow-orchestration-mistakes-and-ways-to-avoid-them/) - common mistakes

### Tertiary (LOW confidence - needs validation)
- Agent respawn strategies - derived from general resilience patterns, validate in testing
</sources>

<metadata>
## Metadata

**Research scope:**
- Core technology: Task orchestration, DAG algorithms, event systems
- Ecosystem: graphlib, p-queue, typed-emitter, Node EventEmitter
- Patterns: Wave execution, agent pooling, typed events
- Pitfalls: Cycles, starvation, race conditions, memory leaks

**Confidence breakdown:**
- Standard stack: HIGH - verified with Context7, npm downloads, active maintenance
- Architecture: HIGH - established patterns from multiple sources
- Pitfalls: HIGH - documented in orchestration literature
- Code examples: HIGH - from Context7/official sources

**Research date:** 2026-01-14
**Valid until:** 2026-02-14 (30 days - stable ecosystem)
</metadata>

---

*Phase: 04-orchestration*
*Research completed: 2026-01-14*
*Ready for planning: yes*
