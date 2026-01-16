# Plan 13-02 FIX: Linting Errors

## Context
- **Phase:** 13 - Context Enhancement & Level 4.0 Automation
- **Plan:** 13-02 Codebase Documentation Generator (FIX)
- **Purpose:** Fix 337 lint errors identified in Gemini review
- **Status:** Core implementation complete and tested (232 tests pass), needs lint cleanup

## Issue to Fix

| Issue | Count | Main Causes |
|-------|-------|-------------|
| **Lint Errors** | ~~337~~ ~~257~~ ~~209~~ ~~175~~ ~~162~~ 144 | `no-unnecessary-condition`, `no-unsafe-member-access`, `no-explicit-any` |

---

## Task Structure

```
Task FIX-A: Auto-fix Lint Errors ---------> [TASK FIX-A COMPLETE]
                |
                v
Task FIX-B: Manual Lint Fixes ------------> [IN PROGRESS]
                |
                v
Task FIX-C: Verify All Passes ------------> [PENDING]
```

---

# Task FIX-A: Auto-fix Lint Errors

## Objective
Apply automatic fixes to reduce error count.

## Requirements

- [x] Run: `npm run lint -- --fix`
- [x] Check remaining error count
- [x] Note which error types remain

## Progress

### Iteration 1 - ESLint Config Update
- Started with 257 errors (not 337 as originally documented)
- Updated `eslint.config.js` to allow numbers and booleans in template expressions
- Result: 209 errors remaining (48 errors fixed via config)

### Error Breakdown (Current - 209 errors):
| Error Type | Count |
|------------|-------|
| `no-unnecessary-condition` | 61 |
| `require-await` | 32 |
| `no-unused-vars` | 22 |
| `no-unsafe-member-access` | 17 |
| `no-explicit-any` | 14 |
| `no-unsafe-assignment` | 12 |
| `no-floating-promises` | 10 |
| `no-unsafe-call` | 7 |
| `no-non-null-assertion` | 6 |
| `use-unknown-in-catch-callback-variable` | 4 |
| `restrict-template-expressions` | 4 |
| `no-unsafe-argument` | 4 |
| `no-deprecated` | 4 |
| Other | 12 |

### Task FIX-A Completion Checklist
- [x] Auto-fix applied (no auto-fixable errors)
- [x] Remaining errors documented

**[TASK FIX-A COMPLETE]**

---

# Task FIX-B: Manual Lint Fixes

## Objective
Fix remaining lint errors manually.

## Requirements

### Part A: Fix `no-unused-vars` Errors

Common causes and fixes:

1. **Unused function parameters** - Prefix with underscore:
   ```typescript
   // Before
   analyze(options: AnalyzerOptions): Promise<Doc>

   // After (if options not used)
   analyze(_options: AnalyzerOptions): Promise<Doc>
   ```

2. **Unused imports** - Remove them:
   ```typescript
   // Before
   import { UsedType, UnusedType } from './types';

   // After
   import { UsedType } from './types';
   ```

3. **Unused variables** - Remove or use them:
   ```typescript
   // Before
   const result = doSomething();
   return otherThing;

   // After (if result not needed)
   doSomething();
   return otherThing;
   ```

4. **Destructured but unused** - Prefix with underscore or remove:
   ```typescript
   // Before
   const { used, unused } = obj;

   // After
   const { used, unused: _unused } = obj;
   // Or just
   const { used } = obj;
   ```

### Part B: Fix `restrict-template-expressions` Errors

This error occurs when non-string values are used in template literals without explicit conversion.

Common fixes:

1. **Objects in templates** - Use JSON.stringify or specific property:
   ```typescript
   // Before
   \`Error: \${error}\`

   // After
   \`Error: \${error instanceof Error ? error.message : String(error)}\`
   // Or
   \`Error: \${JSON.stringify(error)}\`
   ```

2. **Numbers in templates** - Explicitly convert:
   ```typescript
   // Before
   \`Count: \${count}\`

   // After
   \`Count: \${String(count)}\`
   // Or (numbers are usually fine, may need config change)
   \`Count: \${count.toString()}\`
   ```

3. **Possible undefined** - Add null check:
   ```typescript
   // Before
   \`Name: \${item.name}\`

   // After
   \`Name: \${item.name ?? 'unknown'}\`
   ```

4. **Arrays in templates** - Join them:
   ```typescript
   // Before
   \`Items: \${items}\`

   // After
   \`Items: \${items.join(', ')}\`
   ```

### Part C: Fix Files Systematically

Go through each file in `src/infrastructure/analysis/codebase/`:

- [ ] `types.ts` - Usually no lint issues
- [ ] `BaseAnalyzer.ts`
- [ ] `ArchitectureAnalyzer.ts`
- [ ] `PatternsAnalyzer.ts`
- [ ] `DependenciesAnalyzer.ts`
- [ ] `APISurfaceAnalyzer.ts`
- [ ] `DataFlowAnalyzer.ts`
- [ ] `TestStrategyAnalyzer.ts`
- [ ] `KnownIssuesAnalyzer.ts`
- [ ] `CodebaseAnalyzer.ts`
- [ ] `index.ts`
- [ ] All test files (`*.test.ts`)

### Part D: Consider ESLint Config Update (If Appropriate)

~~If many \`restrict-template-expressions\` errors are for safe cases (like numbers), consider updating \`.eslintrc\`:~~

**DONE** - Updated `eslint.config.js` to allow numbers and booleans in template expressions.

```javascript
'@typescript-eslint/restrict-template-expressions': [
  'error',
  {
    allowNumber: true,
    allowBoolean: true,
    allowNullish: false,
    allowAny: false,
  },
],
```

### Iteration 2 - Manual Lint Fixes (Completed)

**Starting errors:** 209
**Ending errors:** 175
**Errors fixed:** 34

**Changes made:**
1. **no-unused-vars fixes:**
   - Removed unused imports from TaskSchemaAdapter.ts (Task, TaskSize, TaskStatus)
   - Removed StandardArea from QuestionGenerator.ts
   - Removed LLMSettings, AgentSettings, CheckpointSettings, UISettings, ProjectSettings from settingsService.ts
   - Removed Priority, TaskStatus, AgentStatus from events.ts
   - Removed vi from CostTracker.test.tsx
   - Removed Pause from EventRow.tsx
   - Removed TimelineEventType from TaskTimeline.test.tsx
   - Removed userEvent from FeatureDetailModal.test.tsx
   - Prefixed unused variables with underscore: _overview, _otherFeatures, _task

2. **require-await fixes:**
   - Removed async from 27+ sync handlers in handlers.ts
   - Removed async from 4 handlers in interview-handlers.ts
   - Removed async from InterviewSessionManager.ts (save, load, loadByProject, delete)
   - Removed async from NexusCoordinator.ts (initialize, start, resume)
   - Removed async from DatabaseClient.ts (migrate, tables, ping, close)
   - Removed async from UIBackendBridge.ts (initialize)
   - Added await to async returns (checkpointManagerRef, humanReviewServiceRef)

3. **restrict-template-expressions fixes:**
   - Fixed TaskSchemaAdapter.ts template expressions with null coalescing

### Iteration 3 - More Manual Lint Fixes

**Starting errors:** 175
**Ending errors:** 162
**Errors fixed:** 13

**Changes made:**
1. **no-unused-vars fixes:**
   - Removed unused 'type' import from QuestionGenerator.ts
   - Prefixed 'isFuture' with underscore in StageProgress.tsx
   - Prefixed 'error' with underscore in WorktreeManager.ts catch block
   - Prefixed 'options' with underscore in ClaudeCodeCLIClient.ts

2. **restrict-template-expressions fixes:**
   - Fixed CLIError template by converting code to String()

3. **require-await / await-thenable fixes:**
   - Converted checkpoint:list handler from async to sync (listCheckpoints is sync)
   - Converted checkpoint:delete handler from async to sync (deleteCheckpoint is sync)
   - Converted review:list handler from async to sync (listPendingReviews is sync)
   - Converted review:get handler from async to sync (getReview is sync)
   - Converted interview:end handler from async to sync (sessionManager.save is sync)
   - Converted interview:pause handler from async to sync (sessionManager.save is sync)
   - Removed await from sessionManager.load and loadByProject calls (they're sync)

### Iteration 4 - More Manual Lint Fixes

**Starting errors:** 162
**Ending errors:** 144
**Errors fixed:** 18

**Changes made:**
1. **handlers.ts:**
   - Removed redundant `!input` check (TypeScript knows required params aren't null)

2. **interview-handlers.ts:**
   - Removed async from interview:resume handler (sessionManager.load is sync)

3. **featureStore.ts:**
   - Removed `typeof window !== 'undefined'` check (always truthy in browser)
   - Added eslint-disable for defensive nexusAPI check
   - Replaced non-null assertions with local variables (priorityFilter, statusFilter)

4. **interviewStore.ts:**
   - Removed unnecessary type parameter T from emitEvent
   - Changed T to unknown for safer typing
   - Added eslint-disable for defensive nexusAPI check

5. **uiStore.ts:**
   - Added eslint-disable comments for deprecated Toast usages (kept for backward compatibility)

6. **stores/index.ts:**
   - Added eslint-disable for deprecated Toast export

7. **scripts/db-status.ts & migrate.ts:**
   - Removed await from client.close() (method is sync)
   - Added `: unknown` type to catch callback variables

### Task FIX-B Completion Checklist
- [ ] All `no-unused-vars` errors fixed
- [ ] All `restrict-template-expressions` errors fixed
- [ ] All other lint errors fixed
- [ ] No new errors introduced

**[TASK FIX-B COMPLETE]** <- Mark this when done, then proceed to Task FIX-C

---

# Task FIX-C: Verify All Passes

## Objective
Ensure everything still works after fixes.

## Requirements

- [ ] Run: `npm run lint`
  - Expected: 0 errors

- [ ] Run: `npm run build`
  - Expected: Success

- [ ] Run: `npm test src/infrastructure/analysis/codebase/`
  - Expected: 232 tests still pass

- [ ] Quick functional check (if possible):
  ```bash
  npm test src/infrastructure/analysis/codebase/integration.test.ts
  ```

### Task FIX-C Completion Checklist
- [ ] `npm run lint` passes with 0 errors
- [ ] `npm run build` succeeds
- [ ] All 232 tests still pass
- [ ] No regressions introduced

**[TASK FIX-C COMPLETE]**

---

## Success Criteria

- [ ] `npm run lint` - 0 errors (down from 337)
- [ ] `npm run build` - Success
- [ ] `npm test src/infrastructure/analysis/codebase/` - 232 tests pass
- [ ] Code ready for Plan 13-03

---

## Recommended Settings

```
--max-iterations 20
--completion-promise "PLAN_13_02_FIX_COMPLETE"
```

## Task Completion Markers

- [x] `[TASK FIX-A COMPLETE]` - Auto-fix applied
- [ ] `[TASK FIX-B COMPLETE]` - Manual fixes done
- [ ] `[TASK FIX-C COMPLETE]` - All verification passes
- [ ] `[PLAN 13-02 FIX COMPLETE]` - Ready for Plan 13-03

---

## Notes

- The 232 tests passing means the logic is correct - we're just cleaning up code style
- Prefer fixing over suppressing lint rules
- If changing eslint config, ensure it matches existing Nexus patterns
- After this fix, Plan 13-02 is complete and we can proceed to Plan 13-03
