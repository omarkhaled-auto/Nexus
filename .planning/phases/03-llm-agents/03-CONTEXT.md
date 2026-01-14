# Phase 3: LLM & Agents - Context

**Gathered:** 2026-01-14
**Status:** Ready for planning

<vision>
## How This Should Work

**Autonomous pipeline with optional transparency.** Users submit tasks/features, agents work independently, come back to completed code. "Walk away and return to finished work" philosophy.

Optional real-time visibility via Dashboard (Phase 11):
- Kanban board shows task progress
- Agent activity visible (which agent, what task, current iteration)
- QA loop progress (Build ✓ → Lint ✓ → Test... iteration 3/50)
- Can watch if desired, but not required

**Key Principle:** Never REQUIRE user attention. Agents self-heal through QA loop (up to 50 iterations). Only escalate to human when truly stuck.

User can choose:
- Fire and forget (check back in hours)
- Watch in real-time (pair programming feel)
- Get notified only on checkpoints/failures

**Escalation Philosophy:**
- DON'T pause everything - other independent tasks continue in parallel
- Failed task: Mark 'escalated', create detailed handoff (iterations attempted, last error, suggested fixes)
- Dependent tasks: Blocked until escalation resolved
- Independent tasks: Continue normally
- One stuck task should NEVER stop the entire pipeline

</vision>

<essential>
## What Must Be Nailed

**LLM tool use is the foundation.** If agents can correctly use tools (read_file, write_file, edit_file, run_command, search_code), everything else follows.

Test tool use exhaustively:
- Happy path: tool succeeds, parse result
- Error path: tool fails, handle gracefully
- Edge cases: large files, binary files, permission denied
- Streaming: tool calls mid-stream
- Chaining: multiple tools in sequence

</essential>

<boundaries>
## What's Out of Scope

- **Multi-agent coordination** - Phase 3 is single agent only. Parallel agents come in Phase 8.
- **Dashboard UI** - Build the engine, not the visibility layer. Dashboard is Phase 11.
- **Planning/decomposition** - Hand-crafted tasks for now. AI task decomposition is Phase 6.
- **Event system** - EventBus comes in Phase 4. For now, just return results.

</boundaries>

<specifics>
## Specific Ideas

### LLM Client Patterns (from Architecture Blueprint)

**ClaudeClient:**
- Use @anthropic-ai/sdk directly (minimal abstraction)
- Rate limiting: 50 req/min, 100k tokens/min with automatic backoff
- Streaming with proper event handling (content_block_delta)
- Tool use with continueWithToolResults() pattern
- Exponential backoff retry on transient errors (429, 500, 503)
- Fail fast on auth errors (401, 403)
- Timeout: 2 minutes per request

**GeminiClient:**
- Use @google/generative-ai directly
- Large context for code review (1M tokens)
- Similar interface to ClaudeClient for consistency

### Model Configuration per Agent (with Extended Thinking)
```typescript
const MODEL_CONFIG: Record<AgentType, ModelConfig> = {
  planner: {
    model: 'claude-opus-4-5-20250514',
    maxTokens: 16000,
    temperature: 1,  // required for extended thinking
    thinking: { type: 'enabled', budget_tokens: 10000 }  // high thinking
  },
  coder: {
    model: 'claude-opus-4-5-20250514',
    maxTokens: 16000,
    temperature: 1,
    thinking: { type: 'enabled', budget_tokens: 5000 }  // medium thinking
  },
  reviewer: {
    model: 'gemini-3.0-pro',  // fallback to gemini-2.5-pro if unavailable
    maxTokens: 8000,
    temperature: 0.2
  },
  tester: {
    model: 'claude-sonnet-4-5-20250514',
    maxTokens: 8000,
    temperature: 0.3
  },
  merger: {
    model: 'claude-sonnet-4-5-20250514',
    maxTokens: 4000,
    temperature: 0.1
  }
};
```

**Extended Thinking Requirements:**
- temperature=1 is REQUIRED for extended thinking mode
- Streaming is REQUIRED for extended thinking
- budget_tokens controls thinking depth (separate from output tokens)
- Thinking content returned in separate block before response

### Agent Behavior
- Stateless execution (all context passed in)
- Tools defined in Anthropic.Tool[] format
- System prompts loaded from config/prompts/*.md
- Clear output structure: filesChanged, testsWritten, errors

### Testing Requirements
- All LLM clients must have deterministic mock mode
- Tests never hit real APIs
- Mock responses simulate realistic tool use flows
- Target: ~130 tests total (30 LLM + 53 agents + 50 quality)

</specifics>

<notes>
## Additional Context

### BUILD-008: LLM Clients (24h)
- ClaudeClient: sendMessage, streamMessage, sendWithTools, continueWithToolResults, extractText
- GeminiClient: Similar interface, large context support
- LLMProvider: Unified routing, usage tracking

### BUILD-009: Agent Runners (32h)
- AgentRunner base class with tool binding and error handling
- CoderRunner: Code generation, TDD-aware, fixIssues()
- TesterRunner: Test writing, coverage analysis
- ReviewerRunner: Structured review output (blocking | warning | suggestion)
- MergerRunner: Conflict detection and resolution
- System prompts in config/prompts/*.md

### BUILD-010: Quality Layer (24h)
- BuildVerifier: tsc --noEmit, parse errors
- LintRunner: ESLint with auto-fix
- TestRunner: Vitest with coverage
- CodeReviewer: AI review via Gemini
- QALoopEngine: Build → Lint → Test → Review cycle, 50 iteration max

### Sprint 3 Success Criteria
- Claude API integration works (chat, streaming, tools)
- Gemini API integration works (code review)
- Single Coder agent can generate code
- QA loop completes full cycle
- Coverage ≥ 75% for execution layer

### Integration Test (MILESTONE-3)
- Execute code generation task with CoderRunner
- Run QA loop to completion (<50 iterations)
- Verify escalation after 50 iterations

</notes>

---

*Phase: 03-llm-agents*
*Context gathered: 2026-01-14*
