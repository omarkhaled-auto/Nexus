# Plan 01-05: ProcessRunner Service - TDD Summary

## Overview

**Plan:** 01-05-PLAN.md
**Service:** ProcessRunner
**Pattern:** TDD (Red-Green-Refactor)
**Status:** COMPLETE

---

## RED Phase: Failing Tests

### Commit

- **Hash:** `aa4ce57`
- **Message:** `test(01-05): add failing tests for ProcessRunner`

### Tests Written (41 total)

**Custom Error Types (5 tests)**
- ProcessError base class with command, exitCode, stdout, stderr
- ProcessError extending Error properly
- TimeoutError extending ProcessError with timeout property
- BlockedCommandError extending ProcessError with blockedCommand property

**isCommandAllowed (6 tests)**
- Safe commands return true (echo, npm, git, node)
- rm -rf / returns false
- mkfs commands return false
- dd if= commands return false
- format c: commands return false
- shutdown/reboot commands return false

**run - Basic Execution (4 tests)**
- Execute echo command and capture output
- Capture both stdout and stderr
- Track execution duration
- Return ProcessResult interface

**run - Exit Code Handling (3 tests)**
- Throw ProcessError on non-zero exit code
- Include exit code in ProcessError
- Include stdout/stderr in ProcessError

**run - Timeout Enforcement (3 tests)**
- Respect timeout option
- Default 30 second timeout
- Set killed flag when timeout occurs

**run - Blocked Command Rejection (2 tests)**
- Throw BlockedCommandError before execution
- Not execute blocked commands

**run - Working Directory (2 tests)**
- Run command in specified cwd
- Default to current working directory

**run - Environment Variables (3 tests)**
- Pass custom environment variables
- Inherit parent environment by default
- Merge custom env with inherited env

**run - Shell Option (1 test)**
- Use shell by default

**runStreaming (7 tests)**
- Return ProcessHandle with pid
- Return ProcessHandle with promise
- Return ProcessHandle with kill function
- Call onStdout callback with output
- Call onStderr callback with error output
- Support cwd option
- Support timeout option
- Throw BlockedCommandError for blocked commands

**kill (3 tests)**
- Kill a running process
- Use tree-kill to terminate process tree
- Handle killing non-existent process gracefully

**Logger Support (2 tests)**
- Accept optional logger in constructor
- Log command execution when logger is provided

### Why Tests Failed

All tests failed initially because the ProcessRunner implementation was a stub with all methods throwing `Error('Not implemented')`. Only the error type tests (5) passed because they tested the error classes which were fully implemented.

---

## GREEN Phase: Implementation

### Commit

- **Hash:** `6eb397f`
- **Message:** `feat(01-05): implement ProcessRunner`

### Implementation Details

**Dependencies Used:**
- `execa` (v9.5.4): Modern process execution library
- `tree-kill` (v1.2.2): Process tree termination for Windows/Unix

**Key Classes:**

```typescript
// Custom Error Types
export class ProcessError extends Error
export class TimeoutError extends ProcessError
export class BlockedCommandError extends ProcessError

// Main Service
export class ProcessRunner {
  run(command: string, options?: RunOptions): Promise<ProcessResult>
  runStreaming(command: string, options?: StreamingOptions): ProcessHandle
  kill(pid: number): Promise<void>
  isCommandAllowed(command: string): boolean
  getDefaultTimeout(): number
}
```

**Implementation Challenges:**

1. **Windows Shell Timeout Issue:**
   - execa's built-in timeout with `shell: true` doesn't work reliably on Windows
   - Solution: Implemented custom timeout using `setTimeout` + `tree-kill`
   - This ensures the entire process tree is killed, not just the shell wrapper

2. **Exit Code Handling:**
   - When processes are killed/terminated, `exitCode` may be `undefined`
   - Solution: Use `exitCode ?? 0` and check `isTerminated` flag

3. **Output Type Conversion:**
   - execa returns `stdout/stderr` as `string | string[] | Uint8Array | undefined`
   - Solution: Created `toStringOutput()` helper to normalize to string

4. **Manual Kill Tracking:**
   - When `handle.kill()` is called, execa doesn't always set `isTerminated`
   - Solution: Track `manuallyKilled` flag in closure for accurate killed detection

**Blocked Commands Pattern:**
```typescript
const BLOCKED_PATTERNS: RegExp[] = [
  /rm\s+(-[a-zA-Z]*)?-?r\s*-?f?\s+\/($|\s)/i, // rm -rf /
  /mkfs(\.[a-z0-9]+)?/i,                       // mkfs, mkfs.ext4, etc.
  /dd\s+if=/i,                                 // dd if=
  /format\s+[a-z]:/i,                          // format c: (Windows)
  /shutdown/i,                                 // shutdown
  /reboot/i,                                   // reboot
];
```

---

## REFACTOR Phase

**Decision:** No refactoring needed

The implementation is clean and well-organized:
- Constants at the top
- Error types grouped together
- Interfaces clearly defined
- Good documentation
- Reasonable separation of concerns

While there is some duplication between `run()` and `runStreaming()` in timeout/error handling, extracting it would add complexity without significant benefit. The duplication is contained and the code is readable.

---

## Test Results

```
Test Files  1 passed (1)
Tests       41 passed (41)
Start at    01:48:16
Duration    4.43s
```

All 41 tests pass with proper Windows cross-platform support.

---

## Files Modified

| File | Changes |
|------|---------|
| `src/infrastructure/process/ProcessRunner.ts` | Full implementation (547 lines) |
| `src/infrastructure/process/ProcessRunner.test.ts` | Test suite (520 lines) |

---

## Commits Produced

| Phase | Hash | Message |
|-------|------|---------|
| RED | `aa4ce57` | `test(01-05): add failing tests for ProcessRunner` |
| GREEN | `6eb397f` | `feat(01-05): implement ProcessRunner` |
| REFACTOR | N/A | No changes needed |

---

## API Reference

### ProcessRunner

```typescript
class ProcessRunner {
  constructor(options?: ProcessRunnerOptions);

  // Execute command and wait for completion
  run(command: string, options?: RunOptions): Promise<ProcessResult>;

  // Execute command with streaming callbacks
  runStreaming(command: string, options?: StreamingOptions): ProcessHandle;

  // Kill process tree by PID
  kill(pid: number): Promise<void>;

  // Check if command is allowed (not blocked)
  isCommandAllowed(command: string): boolean;

  // Get default timeout value (30000ms)
  getDefaultTimeout(): number;
}
```

### Types

```typescript
interface RunOptions {
  cwd?: string;              // Working directory
  timeout?: number;          // Timeout in ms (default: 30000)
  env?: Record<string, string>; // Environment variables
  shell?: boolean;           // Use shell (default: true)
}

interface StreamingOptions extends RunOptions {
  onStdout?: (chunk: string) => void;
  onStderr?: (chunk: string) => void;
}

interface ProcessResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  duration: number;
  killed: boolean;
}

interface ProcessHandle {
  pid: number;
  promise: Promise<ProcessResult>;
  kill: () => void;
}
```

---

## Deviations from Plan

1. **Custom timeout implementation:** Added tree-kill based timeout instead of relying on execa's built-in timeout to handle Windows shell process trees correctly.

2. **Manual kill tracking:** Added `manuallyKilled` flag to accurately track when `handle.kill()` is called, as Windows doesn't always set `isTerminated`.

3. **Output type conversion:** Added `toStringOutput()` helper to handle execa's various output types.

---

## Issues

None. All requirements from the plan were implemented successfully.
