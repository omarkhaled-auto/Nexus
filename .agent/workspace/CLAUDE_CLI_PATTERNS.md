# ClaudeCodeCLIClient Pattern Analysis

## Overview

This document analyzes the patterns used in `ClaudeCodeCLIClient` to guide the implementation of `GeminiCLIClient`. The ClaudeCodeCLIClient is located at `src/llm/clients/ClaudeCodeCLIClient.ts` with tests in `ClaudeCodeCLIClient.test.ts`.

---

## Class Structure

### Configuration Interface

```typescript
export interface ClaudeCodeCLIConfig {
  /** Path to claude binary, default: 'claude' */
  claudePath?: string;
  /** Working directory for claude process */
  workingDirectory?: string;
  /** Timeout in ms, default: 300000 (5 min) */
  timeout?: number;
  /** Retry count, default: 2 */
  maxRetries?: number;
  /** Optional logger */
  logger?: Logger;
}
```

**Pattern for GeminiCLIClient:**
```typescript
export interface GeminiCLIConfig {
  /** Path to gemini binary, default: 'gemini' */
  geminiPath?: string;          // Rename from claudePath
  /** Working directory for gemini process */
  workingDirectory?: string;
  /** Timeout in ms, default: 300000 (5 min) */
  timeout?: number;
  /** Retry count, default: 2 */
  maxRetries?: number;
  /** Optional logger */
  logger?: Logger;
  /** Model to use, default: 'gemini-2.5-pro' */
  model?: string;              // Additional config needed for Gemini
}
```

### Constructor Pattern

```typescript
// Constants at top of file
const DEFAULT_CLAUDE_PATH = 'claude';
const DEFAULT_TIMEOUT = 300000; // 5 minutes
const DEFAULT_MAX_RETRIES = 2;

// Constructor merges defaults with provided config
constructor(config: ClaudeCodeCLIConfig = {}) {
  this.config = {
    claudePath: config.claudePath ?? DEFAULT_CLAUDE_PATH,
    workingDirectory: config.workingDirectory ?? process.cwd(),
    timeout: config.timeout ?? DEFAULT_TIMEOUT,
    maxRetries: config.maxRetries ?? DEFAULT_MAX_RETRIES,
    logger: config.logger,
  };
}
```

### Class Methods Summary

| Method | Visibility | Purpose |
|--------|------------|---------|
| `chat()` | public | Send chat completion request |
| `chatStream()` | public | Stream chat completion (yields at end) |
| `countTokens()` | public | Approximate token count |
| `executeWithTools()` | public | Execute with allowed tools |
| `continueConversation()` | public | Resume conversation by ID |
| `isAvailable()` | public | Check if CLI exists |
| `getVersion()` | public | Get CLI version string |
| `buildArgs()` | private | Build CLI arguments |
| `executeWithRetry()` | private | Execute with retry logic |
| `execute()` | private | Execute CLI command |
| `messagesToPrompt()` | private | Convert messages to prompt |
| `extractSystemPrompt()` | private | Extract system prompt |
| `parseResponse()` | private | Parse CLI output |
| `extractToolCalls()` | private | Extract tool calls from response |
| `mapToolName()` | private | Map single tool name |
| `mapToolNames()` | private | Map array of tool names |
| `toolsToHints()` | private | Generate tool hints (unused) |
| `sleep()` | private | Delay utility |

---

## Key Patterns

### 1. CLI Execution Pattern

**Process Spawning:**
```typescript
private execute(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    this.config.logger?.debug('Executing Claude CLI', { args: args.join(' ') });

    const child = spawn(this.config.claudePath, args, {
      cwd: this.config.workingDirectory,
      env: { ...process.env },
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: process.platform === 'win32', // IMPORTANT: Use shell on Windows
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    // Timeout handling
    const timeout = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new TimeoutError(`Claude CLI timed out after ${this.config.timeout}ms`));
    }, this.config.timeout);

    child.on('close', (code: number | null) => {
      clearTimeout(timeout);
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new CLIError(`Claude CLI exited with code ${String(code)}: ${stderr}`, code));
      }
    });

    child.on('error', (error: Error) => {
      clearTimeout(timeout);
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        reject(new CLINotFoundError());
      } else {
        reject(new CLIError(`Failed to spawn Claude CLI: ${error.message}`));
      }
    });
  });
}
```

**Key points for GeminiCLIClient:**
1. Use `shell: true` on Windows for PATH resolution
2. Capture both stdout and stderr
3. Implement timeout with `setTimeout` + `child.kill('SIGTERM')`
4. Check for `ENOENT` error code to detect CLI not found
5. Clear timeout in all exit paths

### 2. Argument Building Pattern

**Claude CLI uses:**
```typescript
private buildArgs(prompt: string, system?: string, options?: ChatOptions): string[] {
  const args = ['--print'];                    // Non-interactive mode
  args.push('--output-format', 'json');        // JSON output

  if (system) {
    args.push('--system-prompt', system);
  }

  if (options?.maxTokens) {
    args.push('--max-tokens', String(options.maxTokens));
  }

  if (options?.tools && options.tools.length > 0) {
    const toolNames = this.mapToolNames(options.tools);
    args.push('--allowedTools', toolNames.join(','));
  }

  args.push('--message', prompt);              // Prompt last

  return args;
}
```

**For GeminiCLIClient:**
```typescript
private buildArgs(prompt: string, options?: ChatOptions): string[] {
  const args = ['--yolo'];                     // Non-interactive mode (Gemini's equivalent)
  args.push('-o', 'json');                     // JSON output (Gemini syntax)
  args.push('-m', this.config.model);          // Model selection

  // NOTE: Gemini doesn't support --system-prompt
  // System prompt must be prepended to the user prompt

  // NOTE: Gemini doesn't support --max-tokens in same way

  args.push(prompt);                           // Positional argument (not --message)

  return args;
}
```

### 3. Response Parsing Pattern

**Claude CLI parses multiple JSON field names:**
```typescript
private parseResponse(result: string, _options?: ChatOptions): LLMResponse {
  try {
    const json = JSON.parse(result) as Record<string, unknown>;

    // Try multiple field names for content
    const content =
      (json.result as string) ||
      (json.response as string) ||
      (json.content as string) ||
      result;

    // Handle both camelCase and snake_case
    const usage: TokenUsage = {
      inputTokens: Number(json.inputTokens ?? json.input_tokens ?? 0),
      outputTokens: Number(json.outputTokens ?? json.output_tokens ?? 0),
      totalTokens: 0,
    };
    usage.totalTokens = usage.inputTokens + usage.outputTokens;

    // Parse finish reason
    let finishReason: FinishReason = 'stop';
    const stopReason = json.stopReason ?? json.stop_reason;
    if (stopReason === 'tool_use') {
      finishReason = 'tool_use';
    } else if (stopReason === 'max_tokens') {
      finishReason = 'max_tokens';
    }

    const toolCalls = this.extractToolCalls(json);

    return {
      content: typeof content === 'string' ? content : JSON.stringify(content),
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      usage,
      finishReason: toolCalls.length > 0 ? 'tool_use' : finishReason,
    };
  } catch {
    // Fallback for plain text
    return {
      content: result.trim(),
      usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      finishReason: 'stop',
    };
  }
}
```

**For GeminiCLIClient (based on research):**
```typescript
private parseResponse(result: string): LLMResponse {
  try {
    const json = JSON.parse(result);

    // Gemini JSON structure:
    // { session_id, response, stats: { models: { <model>: { tokens: {...} } } } }
    const content = json.response as string;

    // Extract token usage from nested stats
    const modelStats = Object.values(json.stats?.models || {})[0] as any;
    const tokens = modelStats?.tokens || {};

    const usage: TokenUsage = {
      inputTokens: tokens.input ?? tokens.prompt ?? 0,
      outputTokens: tokens.candidates ?? 0,
      totalTokens: tokens.total ?? 0,
    };

    return {
      content: content || '',
      usage,
      finishReason: 'stop',
    };
  } catch {
    return {
      content: result.trim(),
      usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      finishReason: 'stop',
    };
  }
}
```

### 4. Retry Logic Pattern

```typescript
private async executeWithRetry(args: string[]): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
    try {
      return await this.execute(args);
    } catch (error) {
      lastError = error as Error;
      this.config.logger?.warn(
        `CLI attempt ${attempt + 1}/${this.config.maxRetries + 1} failed: ${lastError.message}`
      );

      if (attempt < this.config.maxRetries) {
        // Exponential backoff: 1s, 2s, 4s...
        const delay = 1000 * Math.pow(2, attempt);
        await this.sleep(delay);
      }
    }
  }

  throw lastError ?? new CLIError('Unknown CLI error');
}

private sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
```

**Pattern elements:**
- Loop from 0 to maxRetries (inclusive)
- Store last error for final throw
- Log each failure attempt
- Exponential backoff between retries
- Don't delay after final attempt

### 5. Availability Check Pattern

```typescript
async isAvailable(): Promise<boolean> {
  try {
    await this.execute(['--version']);
    return true;
  } catch {
    return false;
  }
}

async getVersion(): Promise<string> {
  const result = await this.execute(['--version']);
  return result.trim();
}
```

**For GeminiCLIClient:**
```typescript
async isAvailable(): Promise<boolean> {
  try {
    await this.execute(['--version']);
    return true;
  } catch {
    return false;
  }
}
```

### 6. Error Handling Pattern

**Error class hierarchy:**
```typescript
// Base LLM error from ClaudeClient
export class LLMError extends Error { ... }

// CLI-specific error with exit code
export class CLIError extends LLMError {
  exitCode: number | null;
  constructor(message: string, exitCode: number | null = null) {
    super(message);
    this.name = 'CLIError';
    this.exitCode = exitCode;
    Object.setPrototypeOf(this, CLIError.prototype);
  }
}

// Not found error (CLI not installed)
export class CLINotFoundError extends CLIError {
  constructor(message: string = 'Claude CLI not found. Ensure claude is installed and in PATH.') {
    super(message, null);
    this.name = 'CLINotFoundError';
    Object.setPrototypeOf(this, CLINotFoundError.prototype);
  }
}
```

### 7. Message Conversion Pattern

```typescript
private messagesToPrompt(messages: Message[]): string {
  return messages
    .filter((msg) => msg.role !== 'system') // System handled separately
    .map((msg) => {
      if (msg.role === 'user') {
        return `Human: ${msg.content}`;
      } else if (msg.role === 'assistant') {
        return `Assistant: ${msg.content}`;
      } else if (msg.role === 'tool' && msg.toolResults) {
        const results = msg.toolResults
          .map((r) => `Tool ${r.toolCallId}: ${JSON.stringify(r.result)}`)
          .join('\n');
        return `Tool Results:\n${results}`;
      }
      return msg.content;
    })
    .join('\n\n');
}

private extractSystemPrompt(messages: Message[]): string | undefined {
  const systemMsg = messages.find((msg) => msg.role === 'system');
  return systemMsg?.content;
}
```

### 8. Tool Mapping Pattern

```typescript
private mapToolName(nexusTool: string): string {
  const toolMap: Record<string, string> = {
    read_file: 'Read',
    write_file: 'Write',
    edit_file: 'Edit',
    run_command: 'Bash',
    search_code: 'Grep',
    list_files: 'LS',
    web_search: 'WebSearch',
    web_fetch: 'WebFetch',
  };
  return toolMap[nexusTool] ?? nexusTool;
}

private mapToolNames(tools: ToolDefinition[]): string[] {
  return tools.map((t) => this.mapToolName(t.name));
}
```

---

## Interface Compliance

ClaudeCodeCLIClient implements the `LLMClient` interface:

```typescript
export interface LLMClient {
  chat(messages: Message[], options?: ChatOptions): Promise<LLMResponse>;
  chatStream(messages: Message[], options?: ChatOptions): AsyncGenerator<StreamChunk, void, unknown>;
  countTokens(content: string): number;
}
```

**Required methods:**
1. `chat()` - Synchronous chat request
2. `chatStream()` - Async generator for streaming (can yield at end if not supported)
3. `countTokens()` - Token estimation (~4 chars per token)

**Additional methods (not in interface):**
- `isAvailable()` - Useful for availability checks
- `getVersion()` - Useful for diagnostics
- `executeWithTools()` - Tool execution
- `continueConversation()` - Conversation resumption

---

## Test Patterns

### Test File Structure

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { spawn } from 'child_process';
import { ClaudeCodeCLIClient, CLIError, CLINotFoundError } from './ClaudeCodeCLIClient';
import { TimeoutError } from './ClaudeClient';
import type { Message, ChatOptions, ToolDefinition } from '../types';
import { EventEmitter } from 'events';

// Mock child_process
vi.mock('child_process', () => ({
  spawn: vi.fn(),
}));
```

### Mock Child Process Helper

```typescript
function createMockChildProcess(options: {
  stdout?: string;
  stderr?: string;
  exitCode?: number | null;
  error?: Error;
  delay?: number;
}) {
  const mockStdout = new EventEmitter();
  const mockStderr = new EventEmitter();
  const mockProcess = new EventEmitter() as EventEmitter & {
    stdout: EventEmitter;
    stderr: EventEmitter;
    kill: ReturnType<typeof vi.fn>;
  };
  mockProcess.stdout = mockStdout;
  mockProcess.stderr = mockStderr;
  mockProcess.kill = vi.fn();

  // Schedule events asynchronously
  setTimeout(() => {
    if (options.error) {
      mockProcess.emit('error', options.error);
    } else {
      if (options.stdout) {
        mockStdout.emit('data', Buffer.from(options.stdout));
      }
      if (options.stderr) {
        mockStderr.emit('data', Buffer.from(options.stderr));
      }
      setTimeout(() => {
        mockProcess.emit('close', options.exitCode ?? 0);
      }, options.delay ?? 0);
    }
  }, 10);

  return mockProcess;
}
```

### Test Categories (46 tests total)

| Category | Count | Description |
|----------|-------|-------------|
| Constructor | 6 | Default values, custom config |
| isAvailable() | 3 | CLI exists, not found, fails |
| getVersion() | 1 | Version string |
| chat() | 10 | Messages, parsing, system prompt, options |
| chat() with tools | 4 | Tool mapping |
| retry logic | 2 | Retry on failure, max retries exceeded |
| error handling | 4 | Not found, exit code, timeout |
| chatStream() | 2 | Yield text, yield done |
| countTokens() | 3 | Basic, empty, long content |
| response parsing | 4 | Different field names, snake_case |
| Windows compatibility | 1 | Shell usage on Windows |
| executeWithTools() | 5 | Tool flags, multiple tools, empty |
| continueConversation() | 4 | Resume flag, options, parsing |
| tool mapping | 4 | Known tools, unknown tools |

---

## Key Differences for GeminiCLIClient

| Aspect | ClaudeCodeCLIClient | GeminiCLIClient |
|--------|---------------------|-----------------|
| CLI Binary | `claude` | `gemini` |
| Non-interactive flag | `--print` | `--yolo` |
| Output format flag | `--output-format json` | `-o json` |
| Model flag | `--model` | `-m, --model` |
| System prompt | `--system-prompt` | Not supported (prepend to prompt) |
| Max tokens | `--max-tokens` | Not supported directly |
| Tools | `--allowedTools` | MCP server based (not CLI args) |
| Message input | `--message <prompt>` | Positional argument |
| Response field | `result`, `response`, `content` | `response` |
| Token usage | `inputTokens`, `outputTokens` | `stats.models.<model>.tokens` |
| Streaming | Not native (yields at end) | `-o stream-json` (NDJSON) |

---

## Implementation Checklist for GeminiCLIClient

1. [ ] Create `GeminiCLIClient.ts` with same structure
2. [ ] Create `GeminiCLIConfig` interface with model field
3. [ ] Implement `execute()` using spawn (same pattern)
4. [ ] Implement `buildArgs()` with Gemini-specific flags
5. [ ] Implement `parseResponse()` for Gemini JSON format
6. [ ] Implement `executeWithRetry()` (copy pattern)
7. [ ] Implement `chat()` method
8. [ ] Implement `chatStream()` using `-o stream-json`
9. [ ] Implement `countTokens()` (same approximation)
10. [ ] Implement `isAvailable()` and `getVersion()`
11. [ ] Create error classes: `GeminiCLIError`, `GeminiCLINotFoundError`
12. [ ] Handle system prompt by prepending to user prompt
13. [ ] Write comprehensive tests following same structure

---

## Imports Required

```typescript
// Core imports
import { spawn } from 'child_process';

// Type imports from llm/types
import type {
  Message,
  ChatOptions,
  LLMResponse,
  StreamChunk,
  TokenUsage,
  ToolDefinition,
  LLMClient,
  Logger,
  FinishReason,
} from '../types';

// Error classes (can create Gemini-specific or reuse generic)
import { LLMError, TimeoutError } from './ClaudeClient';
```
