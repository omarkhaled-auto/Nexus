---
phase: 03-llm-agents
plan: 01
subsystem: llm
tags: [tdd, anthropic, google-genai, streaming, extended-thinking, tool-use]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: Type definitions, error patterns
provides:
  - ClaudeClient: Full Claude API client with streaming, tools, extended thinking
  - GeminiClient: Google Gemini client with model fallback
  - LLMProvider: Unified provider with agent routing and usage tracking
  - LLM types: Message, ToolCall, ChatOptions, LLMResponse, TokenUsage
affects: [03-02-agent-runners, 04-agentcore, task-execution]

# Tech tracking
tech-stack:
  added: [@anthropic-ai/sdk, @google/genai]
  patterns: [duck-typing-for-mocks, streaming-generators, retry-with-backoff]

key-files:
  created:
    - src/llm/types.ts
    - src/llm/clients/ClaudeClient.ts
    - src/llm/clients/ClaudeClient.test.ts
    - src/llm/clients/GeminiClient.ts
    - src/llm/clients/GeminiClient.test.ts
    - src/llm/LLMProvider.ts
    - src/llm/LLMProvider.test.ts
    - src/llm/index.ts
  modified: [package.json]

key-decisions:
  - "Duck typing for SDK error detection to enable clean mocking in tests"
  - "Auto-streaming when extended thinking enabled (temperature=1 required)"
  - "Gemini model fallback: gemini-3.0-pro to gemini-2.5-pro on 404"
  - "~4 chars per token approximation for countTokens"
  - "Cost calculation uses MODEL_PRICING constant map"

patterns-established:
  - "LLM client interface: chat(), chatStream(), countTokens()"
  - "Error hierarchy: LLMError -> APIError -> RateLimitError/AuthenticationError"
  - "StreamChunk types: thinking, text, tool_use, done"
  - "Retry with exponential backoff: 1s, 2s, 4s delays, max 3 retries"

issues-created: []

# Metrics
duration: 45min
completed: 2026-01-14
test-count: 59
---

# Plan 03-01: LLM Clients Summary

**ClaudeClient + GeminiClient + LLMProvider with 59 tests implementing extended thinking, streaming, and tool support**

## Performance

- **Duration:** 45 min
- **Started:** 2026-01-14T17:20:00Z
- **Completed:** 2026-01-14T18:05:00Z
- **Tests:** 59 (all passing)
- **Files created:** 8

## TDD Execution

### Feature 1: LLM Types (src/llm/types.ts)

**Commit:** `717192b` - feat(03-01): add LLM types and interfaces

Types created:
- Message, MessageRole, ToolCall, ToolResult
- ThinkingConfig for extended thinking
- ChatOptions, LLMResponse, StreamChunk
- TokenUsage with optional thinkingTokens
- AgentType, ModelConfig, ModelPricing
- DEFAULT_MODEL_CONFIGS and MODEL_PRICING constants

### Feature 2: ClaudeClient (25 tests)

**RED Commit:** `fdd1415` - test(03-01): add failing tests for ClaudeClient

Tests written for:
- Error types: LLMError, APIError, RateLimitError, AuthenticationError, TimeoutError
- Constructor: apiKey, baseUrl, logger, timeout options
- chat(): simple messages, tool calls, error handling, retry logic
- chatStream(): text chunks, tool_use chunks, thinking chunks
- countTokens(): approximate token counting
- Extended thinking: auto-streaming, temperature=1 validation

**GREEN Commit:** `70a8d5f` - feat(03-01): implement ClaudeClient with streaming and extended thinking

Implementation:
- Uses @anthropic-ai/sdk for API calls
- chat() with automatic streaming for extended thinking
- chatStream() as async generator with chunk types
- Retry logic with exponential backoff (1s, 2s, 4s)
- Temperature=1 validation for extended thinking
- Duck typing for SDK errors to enable clean testing

### Feature 3: GeminiClient (18 tests)

**RED Commit:** `07f55b2` - test(03-01): add failing tests for GeminiClient

Tests written for:
- Error types: GeminiAPIError, GeminiRateLimitError, GeminiTimeoutError
- Constructor: apiKey, model, logger, timeout options
- chat(): code review prompts, large context (>100k tokens)
- chatStream(): text chunks, done chunk
- countTokens(): approximate token counting
- Model fallback: gemini-3.0-pro to gemini-2.5-pro

**GREEN Commit:** `a0c3aed` - feat(03-01): implement GeminiClient with model fallback

Implementation:
- Uses @google/genai SDK for API calls
- Model fallback on 404 errors
- 120s default timeout for large context
- Retry logic matching ClaudeClient pattern

### Feature 4: LLMProvider (16 tests)

**RED Commit:** `32fc090` - test(03-01): add failing tests for LLMProvider

Tests written for:
- Constructor: API keys, logger
- chat(): routing for planner, coder, reviewer, tester, merger
- chatStream(): streaming from appropriate provider
- Usage tracking: per-agent stats, accumulation, cost calculation, reset
- Model configuration: default configs, option overrides
- countTokens(): delegation to Claude client

**GREEN Commit:** `d491ac5` - feat(03-01): implement LLMProvider with model routing and usage tracking

Implementation:
- Routes agents to appropriate clients based on DEFAULT_MODEL_CONFIGS
- Passes thinking config for planner and coder agents
- Tracks tokens, calls, and cost per agent type
- Cost calculation using MODEL_PRICING constant

### REFACTOR Phase

**Commit:** `1bde9ea` - refactor(03-01): fix lint errors and add module index

Refactoring:
- Fixed setTimeout void return lint errors
- Fixed JSON.parse type assertion
- Fixed unused ModelConfig import
- Updated test mocks to match actual SDK response shape
- Added src/llm/index.ts for clean module exports

## Commits Summary

| Phase | Hash | Message |
|-------|------|---------|
| Types | `717192b` | feat(03-01): add LLM types and interfaces |
| Claude RED | `fdd1415` | test(03-01): add failing tests for ClaudeClient |
| Claude GREEN | `70a8d5f` | feat(03-01): implement ClaudeClient with streaming and extended thinking |
| Gemini RED | `07f55b2` | test(03-01): add failing tests for GeminiClient |
| Gemini GREEN | `a0c3aed` | feat(03-01): implement GeminiClient with model fallback |
| Provider RED | `32fc090` | test(03-01): add failing tests for LLMProvider |
| Provider GREEN | `d491ac5` | feat(03-01): implement LLMProvider with model routing and usage tracking |
| REFACTOR | `1bde9ea` | refactor(03-01): fix lint errors and add module index |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug Fix] SDK Response Shape**
- **Found during:** GeminiClient implementation
- **Issue:** TypeScript errors for accessing `response.text()` - actual SDK uses `response.text` property
- **Fix:** Updated to use correct property access pattern from Context7 docs
- **Files modified:** GeminiClient.ts, GeminiClient.test.ts
- **Verification:** TypeScript compiles, tests pass

**2. [Rule 1 - Bug Fix] Mock SDK Error Classes**
- **Found during:** ClaudeClient testing
- **Issue:** Mocked SDK errors don't work with instanceof checks
- **Fix:** Switched to duck typing (checking `.status` property) for error detection
- **Files modified:** ClaudeClient.ts
- **Verification:** All error handling tests pass

---

**Total deviations:** 2 auto-fixed bugs
**Impact on plan:** Both fixes necessary for correct SDK integration. No scope creep.

## Issues Encountered

- Test for API errors in GeminiClient initially timed out due to fallback retry logic - fixed by using 400 status (non-retryable) instead of 500

## Verification Results

- [x] `pnpm test` - 476 tests pass (59 new LLM tests)
- [x] `pnpm typecheck` - No errors
- [x] LLM files have no lint errors

## Files Created/Modified

| File | Purpose |
|------|---------|
| src/llm/types.ts | All LLM interfaces, types, and constants |
| src/llm/clients/ClaudeClient.ts | Claude API client (~480 LOC) |
| src/llm/clients/ClaudeClient.test.ts | 25 tests for ClaudeClient |
| src/llm/clients/GeminiClient.ts | Gemini API client (~300 LOC) |
| src/llm/clients/GeminiClient.test.ts | 18 tests for GeminiClient |
| src/llm/LLMProvider.ts | Unified provider (~215 LOC) |
| src/llm/LLMProvider.test.ts | 16 tests for LLMProvider |
| src/llm/index.ts | Clean module exports |
| package.json | Added @anthropic-ai/sdk, @google/genai |

## Next Phase Readiness

- LLM clients ready for use by Agent Runners (03-02)
- Extended thinking enabled for planner and coder agents
- ClaudeClient supports tool use for agent actions
- GeminiClient ready for code review tasks
- Usage tracking available for cost monitoring
- Import via: `import { LLMProvider, ClaudeClient, GeminiClient } from '@/llm'`

---
*Phase: 03-llm-agents*
*Plan: 01*
*Completed: 2026-01-14*
