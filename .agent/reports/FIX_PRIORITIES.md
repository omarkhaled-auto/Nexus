# Fix Priorities

## Overview
Prioritized list of issues from Phase 22 Debugging Audit, organized into implementation batches.

**Total Issues:** 22
- P0 (Critical): 2
- P1 (Major): 12
- P2 (Minor): 8

---

## Batch 1: Critical Path Fixes (P0)

These issues affect core functionality and should be addressed before manual testing.

### P0-001: Incomplete Project Completion Metrics
**Severity:** CRITICAL
**File:** `src/main/NexusBootstrap.ts:506-516`
**Impact:** Dashboard shows incorrect completion metrics

**Current Code:**
```typescript
void this.eventBus.emit('project:completed', {
  projectId: String(eventData.projectId),
  totalDuration: 0, // TODO: Track actual duration
  metrics: {
    featuresTotal: 0, // TODO: Track features
    // ...
  },
});
```

**Fix Strategy:**
1. Add `startedAt: Date` tracking to NexusCoordinator when `start()` is called
2. Calculate `totalDuration` from `startedAt` to completion time
3. Track features count from project config
4. Pass actual metrics from coordinator event data

**Estimated Effort:** ~30 minutes

---

### P0-002: QA Max Iterations Configuration
**Severity:** CRITICAL
**File:** `src/execution/qa/QALoopEngine.ts:105`
**Impact:** Tasks may escalate too quickly (default 3 vs spec 50)

**Current Code:**
```typescript
this.maxIterations = config.maxIterations ?? 3;
```

**Fix Strategy:**
1. Verify where QALoopEngine is instantiated (NexusFactory)
2. Ensure `maxIterations: 50` is passed in config
3. OR change default to 50 to match specification

**Verification:**
```bash
grep -rn "QALoopEngine" src/ --include="*.ts" | grep -v test
```

**Estimated Effort:** ~15 minutes

---

## Batch 2: Integration Fixes (P1)

Issues affecting Genesis/Evolution flow reliability.

### P1-001: Silent Requirement Save Failure
**File:** `src/main/NexusBootstrap.ts:342-345`
**Fix:** Emit `system:warning` event for UI notification

```typescript
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.warn(`[NexusBootstrap] Failed to save requirement: ${message}`);
  // ADD: Emit warning for UI visibility
  void this.eventBus.emit('system:warning', {
    component: 'NexusBootstrap',
    message: `Failed to save requirement: ${message}`,
    details: { projectId },
  });
}
```

---

### P1-002: Silent Planning Failure State
**File:** `src/main/NexusBootstrap.ts:429-436`
**Fix:** Add state cleanup on planning failure

```typescript
} catch (error) {
  console.error('[NexusBootstrap] Planning failed:', error);
  // ADD: Reset coordinator state
  if (coordinator.getStatus().state !== 'idle') {
    await coordinator.stop();
  }
  await this.eventBus.emit('project:failed', {
    projectId,
    error: error instanceof Error ? error.message : String(error),
    recoverable: true,
  });
}
```

---

### P1-003: Evolution Mode Without Context
**File:** `src/interview/InterviewEngine.ts:176-178`
**Fix:** Throw error instead of warning, or provide default context

```typescript
if (mode === 'evolution' && !evolutionContext) {
  this.logger?.warn('Evolution mode started without context', { projectId });
  // ADD: Either throw or create minimal context
  throw new Error('Evolution mode requires evolutionContext with projectPath');
}
```

---

### P1-004: analyzeExistingCode Not Implemented
**File:** `src/orchestration/coordinator/NexusCoordinator.ts:472`
**Fix:** Implement basic code analysis for evolution mode

**Strategy:** Use RepoMapGenerator output to inform decomposition:
1. Pass evolution context to decomposer
2. Add "existing files" awareness to task generation
3. Tag tasks with affected files from repo map

---

### P1-005 through P1-012: JSON.parse Validation

Add try-catch wrappers to high-risk JSON.parse calls:

| Priority | File | Line | Risk Level |
|----------|------|------|------------|
| 1 | CheckpointManager.ts | 257 | State restoration |
| 2 | GeminiCLIClient.ts | 330, 518 | LLM responses |
| 3 | ClaudeCodeCLIClient.ts | 406 | LLM responses |
| 4 | MergerAgent.ts | 341 | Agent parsing |
| 5 | ReviewerAgent.ts | 306 | Agent parsing |
| 6 | TaskDecomposer.ts | 339 | Planning |
| 7 | WorktreeManager.ts | 301 | Git registry |
| 8 | ConfigFileLoader.ts | 203 | Config loading |

**Template Fix:**
```typescript
// Before
const parsed = JSON.parse(content);

// After
let parsed: ExpectedType;
try {
  parsed = JSON.parse(content);
  // Optional: Add Zod validation here
} catch (error) {
  console.error('[Component] Failed to parse JSON:', error);
  throw new Error(`Invalid JSON format: ${error instanceof Error ? error.message : 'Unknown error'}`);
}
```

---

## Batch 3: Error Handling Fixes (P2)

### P2-001: app.whenReady Missing Catch
**Files:** `src/main/main.ts:43`, `src/main/index.ts:207`

**Fix:**
```typescript
void app.whenReady().then(async () => {
  // ... existing code
}).catch((error) => {
  console.error('Failed to initialize app:', error);
  app.quit();
});
```

---

### P2-002 through P2-004: Silent Return Null

Add logging to methods that return null without context:

| File | Method | Fix |
|------|--------|-----|
| ConfigFileLoader.ts | loadConfig | Log which config failed |
| RequestContextTool.ts | parseContext | Log parse failure |
| RequestReplanTool.ts | parsePlan | Log parse failure |

---

## Batch 4: Code Quality Fixes (P2)

### P2-005: Type Safety in handlers.ts
**File:** `src/main/ipc/handlers.ts:75-76`

**Current:**
```typescript
let databaseClientRef: { db: any } | null = null
```

**Fix:** Create proper DatabaseClient interface import or use dynamic import pattern.

---

### P2-006: Type Safety in NexusCoordinator
**File:** `src/orchestration/coordinator/NexusCoordinator.ts:70-76`

**Issue:** Multiple `any` typed services to avoid circular dependencies

**Fix Strategy:** Create interface file `orchestration/types/services.ts` with interfaces for:
- QALoopEngine
- WorktreeManager
- CheckpointManager
- MergerRunner
- AgentWorktreeBridge

---

## Files NOT to Modify

These files are working correctly and should not be changed during this fix cycle:

| File | Reason |
|------|--------|
| `src/orchestration/events/EventBus.ts` | Core event system working correctly |
| `src/types/events.ts` | Type definitions complete |
| `src/preload/index.ts` | All APIs properly exposed |
| `src/interview/InterviewEngine.ts` | Core interview flow working |
| All test files | Type casts acceptable in tests |

---

## Verification Commands

After implementing fixes:

```bash
# Full test suite
npm test

# Build verification
npm run build

# Type checking
npm run typecheck

# Specific component tests
npm test -- src/main/NexusBootstrap.test.ts
npm test -- src/execution/qa/QALoopEngine.test.ts

# Check for remaining TODOs
grep -rn "TODO" src/ --include="*.ts" | grep -v test | grep -v ".d.ts"
```

---

## Implementation Order

1. **Day 1 Morning:** Batch 1 (P0 issues - 45 min)
2. **Day 1 Afternoon:** Batch 2 first half (P1-001 to P1-004 - 2 hours)
3. **Day 2 Morning:** Batch 2 second half (JSON.parse fixes - 2 hours)
4. **Day 2 Afternoon:** Batch 3 + 4 (P2 issues - 2 hours)

---

## Risk Assessment

| Fix | Risk | Mitigation |
|-----|------|------------|
| P0-001 Metrics | LOW | Additive change, no breaking |
| P0-002 Max Iterations | LOW | Configuration change only |
| P1-003 Evolution Context | MEDIUM | May break existing flow - add feature flag |
| P1-005+ JSON.parse | LOW | Wrapping with try-catch is safe |
| P2 Type Safety | LOW | Interface changes are compile-time |

---

*Generated as part of Phase 22 Debugging Audit*
