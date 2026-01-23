# Phase 22: Comprehensive Debugging Audit

## Context

- **Project:** Nexus AI Builder
- **Repository:** https://github.com/omarkhaled-auto/Nexus
- **Current State:** Phase 21 complete - infrastructure implemented, 2357 tests passing
- **Purpose:** Perform exhaustive debugging audit BEFORE manual testing to identify all issues
- **Tools Required:** Sequential Thinking MCP, Debugging capabilities

---

## Mission Statement

You are about to perform a COMPREHENSIVE debugging audit of Nexus, an autonomous AI development platform. Your goal is to find EVERY issue - silent failures, missing connections, type mismatches, race conditions, unhandled errors - BEFORE any manual testing occurs.

This audit will save hours of manual debugging by systematically analyzing the entire codebase.

---

## Critical Rules

+============================================================================+
|                                                                            |
|  RULE 1: READ BEFORE ANALYZING                                             |
|          - Read ALL documentation first                                    |
|          - Understand the intended architecture                            |
|          - Know what SHOULD happen before checking what DOES happen        |
|                                                                            |
|  RULE 2: USE SEQUENTIAL THINKING                                           |
|          - Use the sequential thinking MCP for methodical analysis         |
|          - Think through each flow step by step                            |
|          - Don't skip steps or make assumptions                            |
|                                                                            |
|  RULE 3: CHECK EVERY CONNECTION                                            |
|          - Every event emitter must have a listener                        |
|          - Every IPC handler must be registered                            |
|          - Every function call must reach its destination                  |
|                                                                            |
|  RULE 4: DOCUMENT EVERYTHING                                               |
|          - Every issue gets documented with file, line, severity           |
|          - Include suggested fix for each issue                            |
|          - Reference repo patterns where applicable                        |
|                                                                            |
|  RULE 5: PRIORITIZE BY IMPACT                                              |
|          - P0: System unusable / crashes / data loss                       |
|          - P1: Feature broken / major functionality affected               |
|          - P2: Minor issues / edge cases / cosmetic                        |
|                                                                            |
+============================================================================+

---

# =============================================================================
# PHASE A: PROJECT COMPREHENSION (Do This First!)
# =============================================================================

## Step 1: Read Core Documentation

Before analyzing ANY code, read and understand these files completely:

### 1.1 Project Description
```bash
# Read the main project description
cat docs/NEXUS_AI_BUILDER_DESCRIPTION.md 2>/dev/null || \
find . -name "NEXUS_AI_BUILDER_DESCRIPTION.md" -exec cat {} \;
```

Key things to understand:
- What is Nexus? (AI development platform with Genesis and Evolution modes)
- Core principle: No task exceeds 30 minutes
- Two modes: Genesis (new apps) and Evolution (enhance existing)
- Multi-agent architecture with 5 specialized agents

### 1.2 Architecture Blueprint
```bash
# Read architecture documentation
cat docs/05_ARCHITECTURE_BLUEPRINT.md 2>/dev/null || \
find . -name "*ARCHITECTURE*" -exec head -500 {} \;
```

Key things to understand:
- 7-layer architecture (UI -> Orchestration -> Planning -> Execution -> Quality -> Persistence -> Infrastructure)
- Component responsibilities
- Data flow between layers
- Event-driven communication patterns

### 1.3 Integration Specification
```bash
# Read integration specs
cat docs/06_INTEGRATION_SPECIFICATION.md 2>/dev/null || \
find . -name "*INTEGRATION*" -exec head -500 {} \;
```

Key things to understand:
- IPC communication patterns
- Event bus usage
- Component interfaces
- Data format specifications

### 1.4 Master Book
```bash
# Read master implementation guide
cat docs/07_NEXUS_MASTER_BOOK.md 2>/dev/null || \
find . -name "*MASTER_BOOK*" -exec head -1000 {} \;
```

Key things to understand:
- Build order and dependencies
- Component specifications
- Test requirements
- Expected behaviors

### 1.5 Infrastructure Documentation
```bash
# Read new infrastructure docs from Phase 21
cat docs/INFRASTRUCTURE.md 2>/dev/null
```

---

## Step 2: Understand the Codebase Structure

```bash
# Get complete directory structure
find src -type f -name "*.ts" -o -name "*.tsx" | head -200

# Count files by directory
echo "=== Files by Directory ==="
find src -type f \( -name "*.ts" -o -name "*.tsx" \) | sed 's|/[^/]*$||' | sort | uniq -c | sort -rn

# Identify main entry points
echo ""
echo "=== Entry Points ==="
ls -la src/main/index.ts src/main/main.ts 2>/dev/null
ls -la src/renderer/src/main.tsx src/renderer/src/App.tsx 2>/dev/null
```

---

## Step 3: Map the Component Registry

Create a mental map of all major components:

```bash
# Find all major classes/components
echo "=== Core Components ==="
grep -rn "export class\|export const.*=" src/ --include="*.ts" | grep -v test | grep -v ".d.ts" | head -100

# Find all stores (state management)
echo ""
echo "=== Zustand Stores ==="
grep -rn "create<\|zustand" src/ --include="*.ts" --include="*.tsx" | head -30

# Find all IPC handlers
echo ""
echo "=== IPC Handlers ==="
grep -rn "ipcMain.handle\|ipcMain.on" src/ --include="*.ts" | head -50

# Find all event emitters/listeners
echo ""
echo "=== Event Bus Usage ==="
grep -rn "eventBus\|EventBus\|\.emit(\|\.on(" src/ --include="*.ts" | head -50
```

---

# =============================================================================
# PHASE B: CRITICAL PATH ANALYSIS
# =============================================================================

## Step 4: Trace Genesis Mode Flow

Use sequential thinking to trace the COMPLETE Genesis flow:

```
GENESIS MODE FLOW (trace each step)
===================================

1. USER CLICKS "GENESIS MODE"
   - File: src/renderer/src/pages/WelcomePage.tsx (or similar)
   - Check: Does click handler exist?
   - Check: Does it trigger project selector?

2. USER SELECTS PROJECT LOCATION
   - File: src/renderer/src/components/ProjectSelector.tsx
   - Check: Does dialog open?
   - Check: Is path returned correctly?
   - Check: Is project initialized?

3. PROJECT INITIALIZATION
   - File: src/main/services/ProjectInitializer.ts
   - Check: Is directory created?
   - Check: Is .nexus/ created?
   - Check: Is git initialized?
   - Check: Is project stored in database?

4. INTERVIEW PAGE LOADS
   - File: src/renderer/src/pages/InterviewPage.tsx
   - Check: Does page receive project context?
   - Check: Is InterviewEngine initialized?
   - Check: Is session created?

5. USER SENDS MESSAGE
   - File: src/renderer/src/components/interview/InterviewChat.tsx
   - Check: Is message sent via IPC?
   - Check: Does InterviewEngine receive it?
   - Check: Is Claude API called?

6. AI RESPONDS
   - File: src/interview/InterviewEngine.ts
   - Check: Is response streamed back?
   - Check: Are requirements extracted?
   - Check: Are requirements stored?

7. USER COMPLETES INTERVIEW
   - File: src/renderer/src/pages/InterviewPage.tsx
   - Check: Is complete handler called?
   - Check: Is interview:completed event emitted?

8. TASK DECOMPOSITION
   - File: src/main/NexusBootstrap.ts
   - Check: Is interview:completed event caught?
   - Check: Is TaskDecomposer called?
   - Check: Are tasks created?

9. TASKS STORED
   - File: src/planning/TaskDecomposer.ts
   - Check: Are tasks stored in database?
   - Check: Is planning:completed event emitted?

10. KANBAN DISPLAYS TASKS
    - File: src/renderer/src/pages/KanbanPage.tsx
    - Check: Does page query tasks?
    - Check: Are tasks displayed?

11. EXECUTION STARTS
    - File: src/orchestration/coordinator/NexusCoordinator.ts
    - Check: Is start() called?
    - Check: Are agents assigned?

12. AGENTS EXECUTE
    - File: src/orchestration/agents/AgentPool.ts
    - Check: Are worktrees created?
    - Check: Is code generated?
    - Check: Is QA loop running?

13. COMPLETION
    - File: src/orchestration/coordinator/NexusCoordinator.ts
    - Check: Is completion detected?
    - Check: Is output merged?
    - Check: Is user notified?
```

For EACH step above, run:
```bash
# Example for step 1
grep -rn "Genesis\|genesis" src/renderer/src/pages/ --include="*.tsx"
grep -rn "onClick.*genesis\|handleGenesis" src/renderer/ --include="*.tsx"
```

---

## Step 5: Trace Evolution Mode Flow

```
EVOLUTION MODE FLOW (trace each step)
=====================================

1. USER CLICKS "EVOLUTION MODE"
   - Check: Does click handler exist?
   - Check: Does it trigger project selector?

2. USER SELECTS EXISTING PROJECT
   - Check: Does project load correctly?
   - Check: Is .nexus/ detected or created?
   - Check: Is project structure analyzed?

3. KANBAN PAGE LOADS
   - Check: Are existing tasks loaded?
   - Check: Is Kanban board rendered?
   - Check: Can user add new features?

4. USER ADDS FEATURE
   - Check: Is feature card created?
   - Check: Is feature stored?
   - Check: Can feature be dragged?

5. FEATURE MOVED TO IN-PROGRESS
   - Check: Is status updated?
   - Check: Is execution triggered?
   - Check: Are agents assigned?

6. EXECUTION & QA
   - Check: Is code modified correctly?
   - Check: Is QA loop running?
   - Check: Are changes tested?

7. COMPLETION & MERGE
   - Check: Are changes merged?
   - Check: Is feature marked complete?
   - Check: Is Kanban updated?
```

---

## Step 6: Check All IPC Handlers

```bash
# Find all IPC handler registrations
echo "=== Registered IPC Handlers ==="
grep -rn "ipcMain.handle\|ipcMain.on" src/main/ --include="*.ts"

# Find all IPC invocations from renderer
echo ""
echo "=== IPC Invocations from Renderer ==="
grep -rn "ipcRenderer.invoke\|ipcRenderer.send" src/renderer/ --include="*.ts" --include="*.tsx"
grep -rn "window.electron\." src/renderer/ --include="*.ts" --include="*.tsx" | head -50

# Find preload script
echo ""
echo "=== Preload Script ==="
cat src/main/preload.ts 2>/dev/null || cat src/preload/index.ts 2>/dev/null | head -100
```

For each IPC invocation, verify:
- [ ] Handler exists in main process
- [ ] Handler is registered before window creation
- [ ] Return type matches expected type
- [ ] Errors are handled

---

## Step 7: Check All Event Bus Connections

```bash
# Find all event emissions
echo "=== Event Emissions ==="
grep -rn "\.emit(\|eventBus.emit" src/ --include="*.ts" | grep -v test

# Find all event listeners
echo ""
echo "=== Event Listeners ==="
grep -rn "\.on(\|eventBus.on\|\.subscribe(" src/ --include="*.ts" | grep -v test

# Find EventBus definition
echo ""
echo "=== EventBus Definition ==="
cat src/orchestration/events/EventBus.ts 2>/dev/null | head -100
```

For each event:
- [ ] Emission point exists
- [ ] At least one listener exists
- [ ] Listener is registered before emission can occur
- [ ] Event payload type matches listener expectation

---

# =============================================================================
# PHASE C: DEEP CODE ANALYSIS
# =============================================================================

## Step 8: Check for Silent Failures

Silent failures are code paths that fail without throwing errors or notifying the user.

```bash
# Find empty catch blocks
echo "=== Empty Catch Blocks ==="
grep -rn "catch.*{" src/ --include="*.ts" -A 2 | grep -B 1 "^[^}]*}$"

# Find catch blocks that only log
echo ""
echo "=== Catch Blocks That Only Log ==="
grep -rn "catch.*{" src/ --include="*.ts" -A 3 | grep -B 2 "console\.\(log\|error\|warn\)" | grep -v "throw"

# Find functions that return undefined on error
echo ""
echo "=== Functions Returning Undefined on Error ==="
grep -rn "return undefined\|return null\|return;" src/ --include="*.ts" | grep -v test

# Find optional chaining that might silently fail
echo ""
echo "=== Excessive Optional Chaining ==="
grep -rn "\?\.\?\.\?\." src/ --include="*.ts" | head -20
```

---

## Step 9: Check for Type Mismatches

```bash
# Find any type assertions that might hide issues
echo "=== Type Assertions ==="
grep -rn "as any\|as unknown\|// @ts-ignore\|// @ts-expect-error" src/ --include="*.ts"

# Find functions with implicit any
echo ""
echo "=== Potential Implicit Any ==="
grep -rn "function.*\(.*\)" src/ --include="*.ts" | grep -v ": " | head -30

# Check for JSON.parse without validation
echo ""
echo "=== Unvalidated JSON.parse ==="
grep -rn "JSON.parse" src/ --include="*.ts" | grep -v "try\|catch"
```

---

## Step 10: Check for Race Conditions

```bash
# Find async operations without proper awaiting
echo "=== Potential Missing Awaits ==="
grep -rn "async.*{" src/ --include="*.ts" -A 10 | grep -B 5 "[^await ].*\.\(then\|catch\)("

# Find state updates that might race
echo ""
echo "=== State Updates in Async Contexts ==="
grep -rn "setState\|\.set(\|store\." src/ --include="*.ts" | grep "async\|await\|then" | head -20

# Find database operations that might race
echo ""
echo "=== Database Operations ==="
grep -rn "\.insert\|\.update\|\.delete\|\.select" src/ --include="*.ts" | grep -v "await" | head -20
```

---

## Step 11: Check for Null/Undefined Issues

```bash
# Find potential null dereferences
echo "=== Potential Null Dereferences ==="
grep -rn "\.length\|\.map(\|\.forEach(\|\.filter(" src/ --include="*.ts" | grep -v "\?\..*\.\|if.*null\|if.*undefined" | head -30

# Find optional properties accessed without checks
echo ""
echo "=== Optional Property Access ==="
grep -rn "\?:" src/types/ --include="*.ts" -A 0 | head -30
```

---

## Step 12: Check for Hardcoded Values

```bash
# Find hardcoded paths
echo "=== Hardcoded Paths ==="
grep -rn '"/.*/"' src/ --include="*.ts" | grep -v "test\|spec\|__" | head -20

# Find hardcoded URLs
echo ""
echo "=== Hardcoded URLs ==="
grep -rn "http://\|https://" src/ --include="*.ts" | grep -v test | head -20

# Find hardcoded credentials or keys
echo ""
echo "=== Potential Hardcoded Secrets ==="
grep -rn "api_key\|apiKey\|secret\|password\|token" src/ --include="*.ts" | grep "=" | grep -v "process.env\|config\." | head -20

# Find magic numbers
echo ""
echo "=== Magic Numbers ==="
grep -rn "[^a-zA-Z_][0-9]\{4,\}[^a-zA-Z0-9]" src/ --include="*.ts" | grep -v test | head -20
```

---

## Step 13: Check for Dead Code

```bash
# Find unused exports
echo "=== Exported but Possibly Unused ==="
for export_name in $(grep -rh "export.*function\|export.*class\|export.*const" src/ --include="*.ts" | grep -v test | sed 's/.*export[^a-zA-Z]*\(function\|class\|const\)[^a-zA-Z]*\([a-zA-Z_][a-zA-Z_0-9]*\).*/\2/' | sort -u | head -30); do
  count=$(grep -rn "\b$export_name\b" src/ --include="*.ts" | grep -v "export" | wc -l)
  if [ "$count" -lt 2 ]; then
    echo "Possibly unused: $export_name (found $count references)"
  fi
done

# Find commented out code blocks
echo ""
echo "=== Large Commented Code Blocks ==="
grep -rn "^[[:space:]]*//" src/ --include="*.ts" | grep -v "TODO\|FIXME\|NOTE\|http" | head -20

# Find TODO/FIXME comments
echo ""
echo "=== TODO/FIXME Comments ==="
grep -rn "TODO\|FIXME\|HACK\|XXX" src/ --include="*.ts" | grep -v node_modules
```

---

## Step 14: Check Database Operations

```bash
# Find all database table definitions
echo "=== Database Schema ==="
cat src/persistence/database/schema.ts 2>/dev/null | head -100

# Find all database queries
echo ""
echo "=== Database Queries ==="
grep -rn "db\.\|database\." src/ --include="*.ts" | grep -v test | head -50

# Find transactions
echo ""
echo "=== Database Transactions ==="
grep -rn "transaction\|BEGIN\|COMMIT\|ROLLBACK" src/ --include="*.ts" | head -20

# Check for SQL injection risks
echo ""
echo "=== Potential SQL Injection ==="
grep -rn "db.exec\|db.run\|db.all" src/ --include="*.ts" | grep "\`\|\".*+" | head -20
```

---

## Step 15: Check Error Handling in Critical Paths

```bash
# Find try-catch in critical files
echo "=== Error Handling in Core Files ==="
for file in src/main/NexusBootstrap.ts src/orchestration/coordinator/NexusCoordinator.ts src/interview/InterviewEngine.ts src/planning/TaskDecomposer.ts; do
  echo "--- $file ---"
  grep -n "try\|catch\|throw\|Error" "$file" 2>/dev/null | head -10
done

# Find unhandled promise rejections
echo ""
echo "=== Potential Unhandled Rejections ==="
grep -rn "\.then(" src/ --include="*.ts" | grep -v "\.catch\|await" | head -20
```

---

# =============================================================================
# PHASE D: SPECIFIC COMPONENT ANALYSIS
# =============================================================================

## Step 16: Analyze NexusBootstrap

```bash
echo "=== NexusBootstrap Analysis ==="
cat src/main/NexusBootstrap.ts 2>/dev/null

# Check initialization order
echo ""
echo "=== Initialization Order ==="
grep -n "await\|new \|\.initialize\|\.start" src/main/NexusBootstrap.ts 2>/dev/null

# Check event wiring
echo ""
echo "=== Event Wiring ==="
grep -n "\.on(\|\.emit(" src/main/NexusBootstrap.ts 2>/dev/null
```

Questions to answer:
- [ ] Is initialization order correct?
- [ ] Are all components initialized before use?
- [ ] Are all events wired before they can fire?
- [ ] Are errors propagated correctly?

---

## Step 17: Analyze InterviewEngine

```bash
echo "=== InterviewEngine Analysis ==="
find src -name "*Interview*" -name "*.ts" | xargs cat 2>/dev/null | head -200

# Check session management
echo ""
echo "=== Session Management ==="
grep -rn "session\|Session" src/ --include="*.ts" | grep -i interview | head -20

# Check requirement extraction
echo ""
echo "=== Requirement Extraction ==="
grep -rn "requirement\|extract\|parse" src/ --include="*.ts" | grep -i interview | head -20
```

Questions to answer:
- [ ] Is session created correctly?
- [ ] Is Claude API called correctly?
- [ ] Are requirements extracted from responses?
- [ ] Is completion event emitted?

---

## Step 18: Analyze TaskDecomposer

```bash
echo "=== TaskDecomposer Analysis ==="
find src -name "*Decompos*" -name "*.ts" | xargs cat 2>/dev/null | head -200

# Check decomposition logic
echo ""
echo "=== Decomposition Logic ==="
grep -rn "decompose\|Decompose" src/ --include="*.ts" | head -30

# Check 30-minute rule enforcement
echo ""
echo "=== Time Limit Enforcement ==="
grep -rn "30\|minute\|time\|duration\|maxMinutes" src/ --include="*.ts" | head -20
```

Questions to answer:
- [ ] Does it receive requirements correctly?
- [ ] Does it create proper task hierarchy?
- [ ] Is 30-minute rule enforced?
- [ ] Are tasks stored in database?

---

## Step 19: Analyze NexusCoordinator

```bash
echo "=== NexusCoordinator Analysis ==="
find src -name "*Coordinator*" -name "*.ts" | xargs cat 2>/dev/null | head -300

# Check agent coordination
echo ""
echo "=== Agent Coordination ==="
grep -rn "agent\|Agent\|assign\|execute" src/ --include="*.ts" | grep -i coordinator | head -30

# Check task queue management
echo ""
echo "=== Task Queue ==="
grep -rn "queue\|Queue\|next\|pending" src/ --include="*.ts" | grep -i coordinator | head -20
```

Questions to answer:
- [ ] Is task queue managed correctly?
- [ ] Are agents assigned properly?
- [ ] Is parallel execution handled?
- [ ] Is completion detection working?

---

## Step 20: Analyze AgentPool

```bash
echo "=== AgentPool Analysis ==="
find src -name "*Pool*" -name "*.ts" | xargs cat 2>/dev/null | head -200

# Check agent lifecycle
echo ""
echo "=== Agent Lifecycle ==="
grep -rn "create\|destroy\|spawn\|terminate" src/ --include="*.ts" | grep -i agent | head -20

# Check worktree management
echo ""
echo "=== Worktree Management ==="
grep -rn "worktree\|Worktree" src/ --include="*.ts" | head -20
```

---

## Step 21: Analyze QA Loop

```bash
echo "=== QA Loop Analysis ==="
find src -name "*QA*" -o -name "*qa*" -o -name "*Loop*" | grep "\.ts$" | xargs cat 2>/dev/null | head -300

# Check iteration limit
echo ""
echo "=== Iteration Limit ==="
grep -rn "50\|iteration\|max\|limit" src/ --include="*.ts" | grep -i "qa\|loop" | head -20

# Check QA sequence
echo ""
echo "=== QA Sequence (build -> lint -> test -> review) ==="
grep -rn "build\|lint\|test\|review" src/ --include="*.ts" | grep -i "qa\|loop\|step\|phase" | head -30
```

---

# =============================================================================
# PHASE E: GENERATE REPORT
# =============================================================================

## Step 22: Compile Findings into Report

Create a comprehensive report at `.agent/reports/DEBUGGING_AUDIT_REPORT.md`:

```markdown
# Nexus Debugging Audit Report

## Date: [DATE]
## Auditor: Claude Code

---

## Executive Summary

- Total issues found: [NUMBER]
- P0 (Critical - System Unusable): [NUMBER]
- P1 (Major - Feature Broken): [NUMBER]
- P2 (Minor - Edge Cases): [NUMBER]

---

## P0: Critical Issues (Must Fix First)

### Issue P0-001: [Title]
- **File:** [path/to/file.ts]
- **Line:** [line number]
- **Description:** [What is wrong]
- **Impact:** [Why this is critical]
- **Suggested Fix:** [How to fix it]
- **Reference:** [Pattern from reference repo if applicable]

### Issue P0-002: ...
[Continue for all P0 issues]

---

## P1: Major Issues (Should Fix)

### Issue P1-001: [Title]
- **File:** [path/to/file.ts]
- **Line:** [line number]  
- **Description:** [What is wrong]
- **Impact:** [Why this matters]
- **Suggested Fix:** [How to fix it]

[Continue for all P1 issues]

---

## P2: Minor Issues (Nice to Fix)

### Issue P2-001: [Title]
- **File:** [path/to/file.ts]
- **Description:** [What is wrong]
- **Suggested Fix:** [How to fix it]

[Continue for all P2 issues]

---

## Issues by Category

### Missing Connections (Events/IPC without listeners)
| Event/IPC | Emitter File | Missing Listener |
|-----------|--------------|------------------|
| [event] | [file] | [expected location] |

### Silent Failures (Code that fails without errors)
| Location | What Fails Silently | Fix |
|----------|---------------------|-----|
| [file:line] | [description] | [fix] |

### Type Safety Issues
| Location | Issue | Fix |
|----------|-------|-----|
| [file:line] | [description] | [fix] |

### Race Condition Risks
| Location | Risk | Mitigation |
|----------|------|------------|
| [file:line] | [description] | [fix] |

### Missing Error Handling
| Location | Scenario | Fix |
|----------|----------|-----|
| [file:line] | [what could fail] | [how to handle] |

---

## Files Requiring Most Attention

| File | Issue Count | Highest Severity |
|------|-------------|------------------|
| [file1] | [N] | P0 |
| [file2] | [N] | P1 |

---

## Recommendations

### Immediate Actions (Before Any Testing)
1. [Action 1]
2. [Action 2]

### Short-term Fixes (This Week)
1. [Fix 1]
2. [Fix 2]

### Architecture Improvements (Future)
1. [Improvement 1]
2. [Improvement 2]

---

## Reference Patterns to Use When Fixing

When implementing fixes, refer to these patterns from reference repositories:

- **Auto-Claude**: QA loop implementation, worktree management, error recovery
- **GSD (Get-Shit-Done)**: State management (STATE.md), task decomposition, context engineering
- **Ralph**: Multi-agent coordination, event-driven architecture
- **OMO**: LSP integration, AST analysis

---

## Test Coverage Gaps

Areas that need more testing:
1. [Gap 1]
2. [Gap 2]

---

## Audit Completion Checklist

- [ ] All 7 layers audited
- [ ] Genesis mode flow traced
- [ ] Evolution mode flow traced  
- [ ] All IPC handlers verified
- [ ] All event connections verified
- [ ] Silent failures identified
- [ ] Type issues identified
- [ ] Race conditions identified
- [ ] Error handling reviewed
- [ ] Report generated

---

## End of Report
```

---

## Step 23: Create Fix Priorities for Ralph

Create `.agent/reports/FIX_PRIORITIES.md`:

```markdown
# Fix Priorities for Ralph

## Batch 1: Critical Path Fixes (Do First)
These issues prevent basic functionality.

1. [Issue ID] - [File] - [One-line description]
2. [Issue ID] - [File] - [One-line description]
...

## Batch 2: Integration Fixes
These issues break connections between components.

1. [Issue ID] - [File] - [One-line description]
...

## Batch 3: Error Handling Fixes
These issues cause crashes or poor UX.

1. [Issue ID] - [File] - [One-line description]
...

## Batch 4: Code Quality Fixes
These are non-critical improvements.

1. [Issue ID] - [File] - [One-line description]
...

## Files NOT to Modify (Working Correctly)
These files have been verified working - do not change unless necessary:
- [file1]
- [file2]

## Verification After Each Batch
```bash
npm run build
npm test
```

## Reference Patterns
When fixing, use patterns from:
- Auto-Claude: QA loop, worktrees, recovery
- GSD: State management, task decomposition  
- Ralph: Multi-agent coordination
- OMO: LSP integration
```

---

## Output Requirements

After completing this audit, you MUST have created:

1. **`.agent/reports/DEBUGGING_AUDIT_REPORT.md`** - Full detailed report with ALL issues
2. **`.agent/reports/FIX_PRIORITIES.md`** - Prioritized fix list for Ralph
3. **Console summary** - Quick stats output

---

## Final Checklist

Before marking complete, verify:

- [ ] Read all project documentation
- [ ] Traced Genesis mode completely
- [ ] Traced Evolution mode completely
- [ ] Verified all IPC handlers exist
- [ ] Verified all event listeners exist
- [ ] Identified all silent failures
- [ ] Identified all type issues
- [ ] Identified all race conditions
- [ ] Identified all null/undefined risks
- [ ] Checked all database operations
- [ ] Reviewed error handling
- [ ] Analyzed all core components
- [ ] Generated complete report
- [ ] Prioritized all issues
- [ ] Created fix list for Ralph

---

## Notes

- Use sequential thinking MCP for methodical analysis
- Don't make assumptions - verify everything in code
- Focus on runtime issues, not just lint/type errors
- This audit should find issues that tests DON'T catch
- Be thorough - this saves hours of manual debugging later
- Every issue needs: location, description, severity, suggested fix

---

**BEGIN COMPREHENSIVE DEBUGGING AUDIT**
