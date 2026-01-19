# Nexus Event System

## Overview

Nexus uses a centralized event-driven architecture built on the `EventBus` singleton. The event system enables:
- Type-safe event emission and subscription
- Real-time UI updates via IPC forwarding
- Async event handlers
- Event history for debugging
- Wildcard subscriptions for cross-cutting concerns

## EventBus Architecture

### Core Class: `EventBus`
**Location:** `src/orchestration/events/EventBus.ts`

```typescript
// Key Methods
EventBus.getInstance()                    // Get singleton instance
eventBus.emit(type, payload, options?)    // Emit typed event
eventBus.on(type, handler)               // Subscribe (returns unsubscribe fn)
eventBus.once(type, handler)             // Subscribe once
eventBus.off(type, handler)              // Unsubscribe
eventBus.onAny(handler)                  // Wildcard subscription
eventBus.getEventHistory(limit?)         // Get recent events
eventBus.removeAllListeners()            // Clear all subscriptions
```

### Event Structure
```typescript
interface NexusEvent<T> {
  id: string;           // Unique event ID (nanoid)
  type: EventType;      // Event type (e.g., 'task:completed')
  timestamp: Date;      // When event occurred
  payload: T;           // Type-specific payload
  source: string;       // Component that emitted
  correlationId?: string; // For tracing related events
}
```

---

## Complete Event Catalog (51 Events)

### Project Lifecycle Events (8 events)

| Event | Payload | UI Use Case |
|-------|---------|-------------|
| `project:created` | `{ project: Project }` | Show new project in dashboard, trigger navigation |
| `project:updated` | `{ projectId, changes }` | Update project details in UI |
| `project:status-changed` | `{ projectId, previousStatus, newStatus, reason? }` | Update status badge, show notification |
| `project:completed` | `{ projectId, totalDuration, metrics }` | Show completion celebration, update stats |
| `project:failed` | `{ projectId, error, recoverable }` | Show error modal, offer recovery options |
| `project:paused` | `{ projectId, reason? }` | Update status, show pause indicator |
| `project:resumed` | `{ projectId }` | Clear pause indicator, resume animations |
| `project:deleted` | `{ projectId }` | Remove from UI, redirect if viewing |

### Feature Lifecycle Events (6 events)

| Event | Payload | UI Use Case |
|-------|---------|-------------|
| `feature:created` | `{ feature, projectId }` | Add to Kanban board, update counts |
| `feature:updated` | `{ featureId, projectId, changes }` | Update feature card details |
| `feature:status-changed` | `{ featureId, projectId, previousStatus, newStatus }` | Move card in Kanban, animate transition |
| `feature:completed` | `{ featureId, projectId, tasksCompleted, duration }` | Show completion, update progress |
| `feature:failed` | `{ featureId, projectId, error }` | Highlight error state |
| `feature:deleted` | `{ featureId, projectId }` | Remove from Kanban |

### Task Lifecycle Events (10 events)

| Event | Payload | UI Use Case |
|-------|---------|-------------|
| `task:created` | `{ task, projectId, featureId? }` | Add to task list |
| `task:queued` | `{ taskId, projectId, position }` | Show in queue with position |
| `task:assigned` | `{ taskId, agentId, agentType, worktreePath }` | Show agent assignment badge |
| `task:started` | `{ taskId, agentId, startedAt }` | Start progress indicator, timeline event |
| `task:progress` | `{ taskId, agentId, message, percentage? }` | Update progress bar, show live message |
| `task:qa-iteration` | `{ taskId, iteration, result: QAResult }` | Update iteration counter, show QA status |
| `task:completed` | `{ taskId, result: TaskResult }` | Move to complete, show success |
| `task:failed` | `{ taskId, error, iterations, escalated }` | Show error, escalation indicator |
| `task:blocked` | `{ taskId, blockedBy, reason }` | Show blocked state, dependency info |
| `task:escalated` | `{ taskId, reason, iterations, lastError? }` | Show escalation alert, request human review |

### Agent Lifecycle Events (8 events)

| Event | Payload | UI Use Case |
|-------|---------|-------------|
| `agent:spawned` | `{ agent: Agent }` | Add to agent pool display |
| `agent:assigned` | `{ agentId, taskId, worktreePath }` | Update agent status to working |
| `agent:started` | `{ agentId, taskId }` | Start activity indicator |
| `agent:progress` | `{ agentId, taskId, action, details? }` | Stream live output |
| `agent:idle` | `{ agentId, idleSince }` | Update to idle state |
| `agent:error` | `{ agentId, taskId?, error, recoverable }` | Show error state, details |
| `agent:terminated` | `{ agentId, reason, metrics }` | Remove from pool or show terminated |
| `agent:metrics-updated` | `{ agentId, metrics }` | Update performance stats |

### QA Events (6 events)

| Event | Payload | UI Use Case |
|-------|---------|-------------|
| `qa:build-started` | `{ taskId, iteration }` | Show build spinner |
| `qa:build-completed` | `{ taskId, passed, errors, duration }` | Update build status icon |
| `qa:lint-completed` | `{ taskId, passed, errors, warnings, duration }` | Update lint status |
| `qa:test-completed` | `{ taskId, passed, passedCount, failedCount, coverage?, duration }` | Update test results |
| `qa:review-completed` | `{ taskId, approved, reviewer, issueCount, duration }` | Update review status |
| `qa:loop-completed` | `{ taskId, passed, iterations, finalResult }` | Show final QA outcome |

### Interview Events (7 events)

| Event | Payload | UI Use Case |
|-------|---------|-------------|
| `interview:started` | `{ projectId, projectName, mode }` | Initialize interview UI |
| `interview:question-asked` | `{ projectId, questionId, question, category? }` | Display AI question in chat |
| `interview:requirement-captured` | `{ projectId, requirement: Requirement }` | Add requirement card to sidebar |
| `interview:category-completed` | `{ projectId, category, requirementCount }` | Show category completion |
| `interview:completed` | `{ projectId, totalRequirements, categories, duration }` | Enable completion, show summary |
| `interview:cancelled` | `{ projectId, reason? }` | Handle cancellation |
| `interview:saved` | `{ projectId, sessionId }` | Show save confirmation |

### Human Review Events (3 events)

| Event | Payload | UI Use Case |
|-------|---------|-------------|
| `review:requested` | `{ reviewId, taskId, reason, context }` | Show review request notification |
| `review:approved` | `{ reviewId, resolution? }` | Clear review request, continue |
| `review:rejected` | `{ reviewId, feedback }` | Show rejection, await changes |

### System Events (4 events)

| Event | Payload | UI Use Case |
|-------|---------|-------------|
| `system:checkpoint-created` | `{ checkpointId, projectId, reason, gitCommit }` | Add to checkpoint history |
| `system:checkpoint-restored` | `{ checkpointId, projectId, gitCommit }` | Refresh UI state |
| `system:error` | `{ component, error, stack?, recoverable }` | Show error notification |
| `system:warning` | `{ component, message, details? }` | Show warning toast |

---

## IPC Event Forwarding (Main → Renderer)

The main process subscribes to EventBus events and forwards them to the renderer via IPC.

### Forward Functions

| Function | IPC Channel | Purpose |
|----------|-------------|---------|
| `forwardTimelineEvent(event)` | `timeline:event` | Send to timeline feed |
| `forwardAgentMetrics(metrics)` | `agent:metrics` | Update agent status |
| `forwardMetricsUpdate(metrics)` | `metrics:overview` | Update dashboard stats |
| `forwardTaskUpdate(task)` | `task:updated` | Update task in Kanban |
| `forwardAgentStatus(status)` | `agent:status` | Update agent card |
| `forwardExecutionProgress(progress)` | `execution:progress` | Update execution view |

### Timeline Event Types

These are simplified event types forwarded to the UI:

```typescript
type TimelineEventType =
  | 'task_started'
  | 'task_completed'
  | 'task_failed'
  | 'qa_iteration'
  | 'agent_task_assigned'
  | 'agent_error'
  | 'build_started'
  | 'build_completed'
  | 'qa_passed'
  | 'qa_failed'
  | 'feature_status_changed'
  | 'feature_completed'
  | 'checkpoint_created';
```

---

## Preload API (Renderer → Main)

The renderer accesses events through the preload bridge:

### Available Methods

```typescript
// From src/preload/index.ts

// Emit event to backend
window.nexus.emitEvent(channel: string, payload: unknown): Promise<void>

// Subscribe to timeline events
window.nexus.onTimelineEvent(callback: (event: unknown) => void): Unsubscribe

// Subscribe to agent metrics
window.nexus.onAgentMetrics(callback: (metrics: unknown) => void): Unsubscribe

// Subscribe to task updates
window.nexus.onTaskUpdated(callback: (task: unknown) => void): Unsubscribe
```

---

## UI Integration Patterns

### Pattern 1: Real-time Agent Activity

```typescript
// In React component
useEffect(() => {
  const unsubscribe = window.nexus.onAgentMetrics((metrics) => {
    setAgentStatus(prev => ({
      ...prev,
      [metrics.id]: metrics
    }));
  });
  return () => unsubscribe();
}, []);
```

### Pattern 2: Timeline Feed

```typescript
// Subscribe to all timeline events
useEffect(() => {
  const unsubscribe = window.nexus.onTimelineEvent((event) => {
    setTimeline(prev => [event, ...prev].slice(0, 100));
  });
  return () => unsubscribe();
}, []);
```

### Pattern 3: Task Status Updates

```typescript
// Update Kanban when tasks change
useEffect(() => {
  const unsubscribe = window.nexus.onTaskUpdated((task) => {
    updateTaskInColumn(task.id, task.status);
  });
  return () => unsubscribe();
}, []);
```

---

## Event Categories Summary

| Category | Count | Primary UI Component |
|----------|-------|---------------------|
| Project | 8 | Dashboard, Project Settings |
| Feature | 6 | Kanban Board |
| Task | 10 | Kanban Cards, Task Details |
| Agent | 8 | Agent Activity Panel |
| QA | 6 | Execution Logs, Task Cards |
| Interview | 7 | Interview Page |
| Review | 3 | Review Modal/Notification |
| System | 4 | Global Toast/Alert |
| **Total** | **52** | - |

---

## UI Components Needing Event Integration

Based on the event system, the following UI components need event subscriptions:

### Dashboard Page
- `project:created` - Add to recent projects
- `project:status-changed` - Update project cards
- `task:completed` - Update task counts
- `agent:assigned` / `agent:idle` - Update agent feed

### Interview Page
- `interview:question-asked` - Display new question
- `interview:requirement-captured` - Add requirement card
- `interview:completed` - Enable completion button

### Tasks/Kanban Page
- `task:created` - Add task card
- `task:started` / `task:completed` / `task:failed` - Move cards between columns
- `task:progress` - Update progress on card

### Agents Page
- `agent:spawned` / `agent:terminated` - Update pool display
- `agent:assigned` / `agent:idle` - Update status badges
- `agent:progress` - Stream live output
- `agent:error` - Show error state

### Execution Page
- `qa:build-started` / `qa:build-completed` - Build status
- `qa:lint-completed` - Lint status
- `qa:test-completed` - Test results
- `qa:review-completed` - Review status
- `qa:loop-completed` - Final QA result

### Settings Page
- `system:checkpoint-created` - Show in checkpoint history

---

## Best Practices for UI Event Handling

1. **Always unsubscribe** - Return cleanup function in useEffect
2. **Throttle updates** - For high-frequency events like `task:progress`
3. **Optimistic UI** - Update immediately, reconcile on confirmation
4. **Error boundaries** - Handle event handler errors gracefully
5. **Event deduplication** - Use event IDs to prevent duplicate updates
6. **Correlation tracking** - Use correlationId for related event chains
