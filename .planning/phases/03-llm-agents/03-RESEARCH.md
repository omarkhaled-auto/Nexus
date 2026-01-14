# Phase 3: LLM & Agents - Research

**Researched:** 2026-01-14
**Domain:** LLM API integration (Claude/Gemini) + Agent execution framework
**Confidence:** HIGH

<research_summary>
## Summary

Researched the Anthropic SDK (TypeScript) and Google Gen AI SDK for implementing LLM clients with tool use, streaming, and error handling. The standard approach uses the official SDKs directly with minimal abstraction.

Key finding: The Anthropic SDK provides a `toolRunner` helper that handles the entire tool loop automatically - tool calls, result handling, and conversation management. This significantly reduces boilerplate. For Gemini, use the `@google/genai` package with `generateContentStream` for code review with large context (1M tokens).

**Primary recommendation:** Use `@anthropic-ai/sdk` with `betaTool()` helper for tool definitions and `toolRunner()` for automated tool execution. Use `@google/genai` for Gemini with direct `generateContentStream()`. Avoid hand-rolling retry logic - SDK has built-in retries (default: 2, configurable).
</research_summary>

<standard_stack>
## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @anthropic-ai/sdk | latest | Claude API client | Official SDK with tool helpers |
| @google/genai | latest | Gemini API client | Official JS SDK for Gemini API |
| zod | 3.25.0+ | Schema validation | Required for betaZodTool() type safety |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| p-retry | 5.x | Retry logic | Only if SDK retries insufficient |
| tiktoken | 1.x | Token counting | Approximate token estimation |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @anthropic-ai/sdk | openai-compatible API | Less type safety, no tool helpers |
| @google/genai | @google-cloud/vertexai | Vertex for enterprise, genai for API key auth |
| betaZodTool | betaTool (JSON Schema) | Zod has runtime validation, JSON Schema doesn't |

**Installation:**
```bash
pnpm add @anthropic-ai/sdk @google/genai zod
```
</standard_stack>

<architecture_patterns>
## Architecture Patterns

### Recommended Project Structure
```
src/llm/
├── clients/
│   ├── ClaudeClient.ts      # Anthropic SDK wrapper
│   ├── GeminiClient.ts      # Google GenAI wrapper
│   └── types.ts             # Shared LLM types
├── LLMProvider.ts           # Routes to correct client per agent
└── index.ts                 # Public exports

src/execution/
├── agents/
│   ├── AgentRunner.ts       # Base class with tool loop
│   ├── CoderRunner.ts       # Code generation agent
│   ├── TesterRunner.ts      # Test writing agent
│   ├── ReviewerRunner.ts    # Code review agent (uses Gemini)
│   └── MergerRunner.ts      # Git merge agent
└── qa-loop/
    └── QALoopEngine.ts      # Build→Lint→Test→Review cycle

config/prompts/
├── coder.md                 # System prompt for Coder agent
├── tester.md                # System prompt for Tester agent
├── reviewer.md              # System prompt for Reviewer agent
└── merger.md                # System prompt for Merger agent
```

### Pattern 1: Tool Runner (Recommended)
**What:** Use Anthropic's `toolRunner()` for automatic tool loop handling
**When to use:** Any agent that needs tool execution
**Example:**
```typescript
// Source: Context7 /anthropics/anthropic-sdk-typescript
import { Anthropic } from '@anthropic-ai/sdk';
import { betaZodTool } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';

const anthropic = new Anthropic();

const readFileTool = betaZodTool({
  name: 'read_file',
  description: 'Read the contents of a file',
  inputSchema: z.object({
    path: z.string().describe('The file path to read')
  }),
  run: async (input) => {
    return await fs.readFile(input.path, 'utf-8');
  }
});

const runner = anthropic.beta.messages.toolRunner({
  model: 'claude-sonnet-4-5',
  max_tokens: 16000,
  tools: [readFileTool],
  messages: [{ role: 'user', content: task.description }]
});

// Runner handles tool loop automatically
const finalMessage = await runner;
```

### Pattern 2: Manual Tool Loop (When Needed)
**What:** Handle tool calls manually for custom control
**When to use:** Custom error handling, logging, or injection
**Example:**
```typescript
// Source: Context7 /anthropics/anthropic-sdk-typescript
const tools: Anthropic.Tool[] = [{
  name: 'read_file',
  description: 'Read file contents',
  input_schema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'File path' }
    },
    required: ['path']
  }
}];

let response = await client.messages.create({
  model: 'claude-sonnet-4-5',
  max_tokens: 16000,
  messages,
  tools
});

while (response.stop_reason === 'tool_use') {
  const toolUse = response.content.find(b => b.type === 'tool_use');
  const result = await executeToolCall(toolUse);

  messages.push(
    { role: 'assistant', content: response.content },
    { role: 'user', content: [{
      type: 'tool_result',
      tool_use_id: toolUse.id,
      content: result
    }]}
  );

  response = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 16000,
    messages,
    tools
  });
}
```

### Pattern 3: Gemini Streaming for Large Context
**What:** Use Gemini's streaming API for code review
**When to use:** Code review with large files (up to 1M tokens)
**Example:**
```typescript
// Source: Context7 /websites/googleapis_github_io_js-genai
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const response = await ai.models.generateContentStream({
  model: 'gemini-3.0-pro',  // fallback to gemini-2.5-pro if unavailable
  contents: codeToReview,
  config: { maxOutputTokens: 8000 }
});

for await (const chunk of response) {
  process.stdout.write(chunk.text);
}
```

### Pattern 4: Extended Thinking (Claude Opus)
**What:** Enable deep reasoning with thinking budget for complex planning tasks
**When to use:** Planner and coder agents that need multi-step reasoning
**Requirements:**
- temperature MUST be 1 (required for extended thinking)
- Streaming is REQUIRED
- budget_tokens controls thinking depth (separate from output tokens)

**Example:**
```typescript
// Extended thinking with streaming (REQUIRED)
const stream = await client.messages.stream({
  model: 'claude-opus-4-5-20250514',
  max_tokens: 16000,
  temperature: 1,  // REQUIRED for extended thinking
  thinking: {
    type: 'enabled',
    budget_tokens: 10000  // thinking depth
  },
  messages: [{ role: 'user', content: task.description }]
});

// Handle thinking and text blocks separately
for await (const event of stream) {
  if (event.type === 'content_block_delta') {
    if (event.delta.type === 'thinking_delta') {
      // Thinking content (internal reasoning)
      console.log('[thinking]', event.delta.thinking);
    } else if (event.delta.type === 'text_delta') {
      // Actual response
      console.log(event.delta.text);
    }
  }
}

// Token usage includes thinking
const message = await stream.finalMessage();
console.log('Thinking tokens:', message.usage.thinking_tokens);
```

**Model Configuration for Extended Thinking:**
```typescript
const MODEL_CONFIG = {
  planner: {
    model: 'claude-opus-4-5-20250514',
    maxTokens: 16000,
    temperature: 1,
    thinking: { type: 'enabled', budget_tokens: 10000 }
  },
  coder: {
    model: 'claude-opus-4-5-20250514',
    maxTokens: 16000,
    temperature: 1,
    thinking: { type: 'enabled', budget_tokens: 5000 }
  },
  // No thinking for faster agents
  tester: { model: 'claude-sonnet-4-5-20250514', maxTokens: 8000, temperature: 0.3 },
  merger: { model: 'claude-sonnet-4-5-20250514', maxTokens: 4000, temperature: 0.1 }
};
```

### Anti-Patterns to Avoid
- **Wrapping SDK too much:** The SDK handles retries, streaming, tool loops. Don't reimplement.
- **Text before tool_result:** In user messages, tool_result blocks must come FIRST.
- **Separate messages for parallel tool results:** All tool results must be in ONE user message.
- **Custom retry logic:** SDK has built-in retries with exponential backoff.
</architecture_patterns>

<dont_hand_roll>
## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tool execution loop | Manual while loop with tool_use checks | `toolRunner()` beta helper | Handles all edge cases, streaming, errors |
| Retry logic | Custom exponential backoff | SDK built-in (maxRetries) | Handles 429, 5xx, connection errors |
| Tool schema validation | Manual JSON Schema parsing | `betaZodTool()` with Zod | Runtime validation + TypeScript types |
| Streaming parsing | Manual SSE/chunk handling | SDK stream methods | Handles content_block_delta events |
| Token counting | tiktoken or manual | SDK approximate (4 chars/token) | Good enough for planning |
| Rate limit handling | Manual 429 detection | SDK auto-backoff | Default 2 retries with exponential delay |

**Key insight:** Both SDKs are mature with excellent developer experience. The Anthropic SDK's `toolRunner()` in particular eliminates 80% of agent boilerplate. Fighting the SDK leads to subtle bugs in tool result ordering and error handling.
</dont_hand_roll>

<common_pitfalls>
## Common Pitfalls

### Pitfall 1: Tool Result Ordering
**What goes wrong:** Claude refuses to make parallel tool calls in future turns
**Why it happens:** Tool results were formatted incorrectly in message history
**How to avoid:** All tool_result blocks in ONE user message, no text before them
**Warning signs:** Claude making sequential tool calls when parallel is expected
```typescript
// WRONG: Text before tool_result
{ role: 'user', content: [
  { type: 'text', text: 'Results:' },  // ❌ 400 error
  { type: 'tool_result', tool_use_id: 'x', content: '...' }
]}

// CORRECT: tool_result first
{ role: 'user', content: [
  { type: 'tool_result', tool_use_id: 'x', content: '...' },
  { type: 'text', text: 'What next?' }  // ✅ OK after
]}
```

### Pitfall 2: max_tokens Truncation
**What goes wrong:** Response cut off mid-tool-call with invalid JSON
**Why it happens:** max_tokens too low for complex tool responses
**How to avoid:** Check stop_reason, retry with higher max_tokens if truncated
**Warning signs:** stop_reason === 'max_tokens' with incomplete tool_use block

### Pitfall 3: Mock Mode for Tests
**What goes wrong:** Tests hit real APIs, flaky, slow, expensive
**Why it happens:** No mock layer implemented
**How to avoid:** Inject mock client in tests, deterministic responses
**Warning signs:** Tests requiring ANTHROPIC_API_KEY, network-dependent failures
```typescript
// Test setup
const mockClient = {
  messages: {
    create: vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: 'Mocked response' }],
      stop_reason: 'end_turn'
    })
  }
};
```

### Pitfall 4: Gemini Safety Filters
**What goes wrong:** Code review blocked as "unsafe content"
**Why it happens:** Default safety settings too restrictive for code
**How to avoid:** Configure safety settings for code context
**Warning signs:** Empty responses or safety-related errors on valid code

### Pitfall 5: Rate Limit Exhaustion
**What goes wrong:** 429 errors in production, degraded service
**Why it happens:** No usage tracking, no backoff coordination
**How to avoid:** Track usage per agent type, implement circuit breaker
**Warning signs:** Frequent retries, increasing response latency

### Pitfall 6: Extended Thinking Configuration
**What goes wrong:** API returns error or ignores thinking parameter
**Why it happens:** Wrong temperature or non-streaming request
**How to avoid:**
- Always use temperature=1 with extended thinking
- Always use streaming (messages.stream, not messages.create)
- Track thinking_tokens separately in usage stats
**Warning signs:** No thinking content in response, error about temperature
```typescript
// WRONG: Non-streaming with thinking
const response = await client.messages.create({
  thinking: { type: 'enabled', budget_tokens: 5000 },
  temperature: 0.3  // ❌ Must be 1
});

// CORRECT: Streaming with temperature=1
const stream = await client.messages.stream({
  thinking: { type: 'enabled', budget_tokens: 5000 },
  temperature: 1  // ✅ Required
});
```
</common_pitfalls>

<code_examples>
## Code Examples

Verified patterns from official sources:

### ClaudeClient with Tool Runner
```typescript
// Source: Context7 /anthropics/anthropic-sdk-typescript helpers.md
import Anthropic from '@anthropic-ai/sdk';
import { betaZodTool } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';

const client = new Anthropic();

const writeFileTool = betaZodTool({
  name: 'write_file',
  description: 'Write content to a file',
  inputSchema: z.object({
    path: z.string().describe('File path'),
    content: z.string().describe('File content')
  }),
  run: async (input) => {
    await fs.writeFile(input.path, input.content);
    return `Wrote ${input.content.length} chars to ${input.path}`;
  }
});

const runner = client.beta.messages.toolRunner({
  model: 'claude-sonnet-4-5',
  max_tokens: 16000,
  tools: [writeFileTool],
  messages: [{ role: 'user', content: 'Create a hello.ts file' }]
});

// Iterate for streaming or just await for final
for await (const message of runner) {
  console.log(message.content);
}
```

### Error Handling with Typed Errors
```typescript
// Source: Context7 /anthropics/anthropic-sdk-typescript README.md
import Anthropic from '@anthropic-ai/sdk';

try {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 1024,
    messages: [{ role: 'user', content: 'Hello' }]
  });
} catch (err) {
  if (err instanceof Anthropic.RateLimitError) {
    // SDK already retried, this is final failure
    console.log('Rate limit exceeded after retries');
  } else if (err instanceof Anthropic.AuthenticationError) {
    console.log('Invalid API key');
  } else if (err instanceof Anthropic.BadRequestError) {
    console.log('Invalid request:', err.message);
  }
}
```

### Gemini Code Review with Streaming
```typescript
// Source: Context7 /websites/googleapis_github_io_js-genai
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function reviewCode(code: string): Promise<string> {
  const prompt = `Review this code for bugs, security issues, and improvements:

\`\`\`typescript
${code}
\`\`\`

Respond with JSON: { "approved": boolean, "issues": [{ "severity": "critical|major|minor|suggestion", "message": string }] }`;

  const response = await ai.models.generateContentStream({
    model: 'gemini-2.5-pro',
    contents: prompt,
    config: {
      maxOutputTokens: 8000,
      temperature: 0.2
    }
  });

  let result = '';
  for await (const chunk of response) {
    result += chunk.text;
  }
  return result;
}
```

### Configuring SDK Retries
```typescript
// Source: Context7 /anthropics/anthropic-sdk-typescript README.md
// Global retry configuration
const client = new Anthropic({
  maxRetries: 3  // Default is 2
});

// Per-request override
await client.messages.create(
  { model: 'claude-sonnet-4-5', max_tokens: 1024, messages: [...] },
  { maxRetries: 5 }
);
```
</code_examples>

<sota_updates>
## State of the Art (2025-2026)

What's changed recently:

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual tool loop | toolRunner() beta | 2025 | Eliminates boilerplate, handles edge cases |
| JSON Schema tools | betaZodTool() | 2025 | Runtime validation + TypeScript types |
| claude-3-opus | claude-opus-4-5-20250514 | 2025 | Better tool use, extended thinking |
| gemini-1.5-pro | gemini-3.0-pro (fallback 2.5) | 2026 | Improved code understanding, 1M tokens |
| google-generativeai | @google/genai | 2025 | New SDK, unified interface |
| No deep reasoning | Extended Thinking | 2025 | Multi-step reasoning with thinking budget |

**New tools/patterns to consider:**
- **Extended Thinking:** Enable deep reasoning for planner/coder with budget_tokens (requires temp=1, streaming)
- **Tool Search Tool:** For large tool collections (>50 tools), use search to reduce context
- **Programmatic Tool Calling:** Claude writes Python to orchestrate tools (reduces context)
- **input_examples:** Beta feature for complex tool schemas

**Deprecated/outdated:**
- **@google/generative-ai:** Replaced by @google/genai
- **Manual SSE parsing:** Use SDK stream methods
- **claude-3-sonnet:** Use claude-sonnet-4-5 for tool use
</sota_updates>

<open_questions>
## Open Questions

Things that couldn't be fully resolved:

1. **Token counting accuracy**
   - What we know: ~4 chars per token is approximate, tiktoken is more accurate
   - What's unclear: SDK doesn't expose exact token count before request
   - Recommendation: Use tiktoken for cost estimation, SDK for actual usage tracking

2. **Gemini function calling vs code review**
   - What we know: Gemini supports function calling, but we're using it for review only
   - What's unclear: Whether function calling would improve review structure
   - Recommendation: Start with plain text review, consider function calling if structure issues arise

3. **Rate limit coordination across agents**
   - What we know: Each agent makes independent requests
   - What's unclear: Best pattern for shared rate limiting across concurrent agents
   - Recommendation: Implement centralized usage tracker in LLMProvider, defer advanced rate limiting to Phase 8 (multi-agent)
</open_questions>

<sources>
## Sources

### Primary (HIGH confidence)
- Context7 `/anthropics/anthropic-sdk-typescript` - tool helpers, error handling, streaming
- Context7 `/websites/googleapis_github_io_js-genai` - streaming, chat, error handling
- Context7 `/websites/ai_google_dev_gemini-api` - model specs, function calling
- [Claude Platform Docs - Tool Use](https://platform.claude.com/docs/en/agents-and-tools/tool-use/implement-tool-use) - comprehensive implementation guide

### Secondary (MEDIUM confidence)
- [Anthropic Engineering Blog - Advanced Tool Use](https://www.anthropic.com/engineering/advanced-tool-use) - tool search, programmatic calling
- [Google Developers Blog - Gemini 2.5 Pro](https://developers.googleblog.com/en/gemini-2-5-pro-io-improved-coding-performance/) - code performance improvements

### Tertiary (LOW confidence - needs validation)
- None - all key findings verified against official sources
</sources>

<metadata>
## Metadata

**Research scope:**
- Core technology: @anthropic-ai/sdk, @google/genai
- Ecosystem: zod for schema validation
- Patterns: toolRunner, streaming, error handling
- Pitfalls: tool_result ordering, rate limits, mocking

**Confidence breakdown:**
- Standard stack: HIGH - verified with Context7, official docs
- Architecture: HIGH - from SDK examples and best practices
- Pitfalls: HIGH - documented in official docs
- Code examples: HIGH - from Context7/official sources

**Research date:** 2026-01-14
**Valid until:** 2026-02-14 (30 days - SDK ecosystem stable)
</metadata>

---

*Phase: 03-llm-agents*
*Research completed: 2026-01-14*
*Ready for planning: yes*
