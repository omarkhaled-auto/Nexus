import { spawn } from 'child_process';
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
import { LLMError, TimeoutError } from './ClaudeClient';

/**
 * Configuration options for Claude Code CLI client
 */
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
  /** Skip permission prompts for automated usage, default: false */
  skipPermissions?: boolean;
}

/**
 * Error specific to CLI execution failures
 */
export class CLIError extends LLMError {
  exitCode: number | null;

  constructor(message: string, exitCode: number | null = null) {
    super(message);
    this.name = 'CLIError';
    this.exitCode = exitCode;
    Object.setPrototypeOf(this, CLIError.prototype);
  }
}

/**
 * Error when Claude CLI is not available.
 *
 * Provides a helpful two-option message:
 * 1. How to install the CLI
 * 2. How to use API key instead
 *
 * Phase 16: Task 13 - Unified error messages
 */
export class CLINotFoundError extends CLIError {
  /** Command to install the CLI */
  readonly installCommand = 'npm install -g @anthropic-ai/claude-code';

  /** URL for more installation information */
  readonly installUrl = 'https://docs.anthropic.com/claude/docs/claude-code-cli';

  /** Environment variable for API key fallback */
  readonly envVariable = 'ANTHROPIC_API_KEY';

  /** Path in Settings UI to configure API backend */
  readonly settingsPath = 'Settings → LLM Providers → Claude → Use API';

  constructor(
    message: string = `Claude CLI not found.\n\n` +
      `You have two options:\n\n` +
      `━━━ OPTION 1: Install the CLI ━━━\n` +
      `  npm install -g @anthropic-ai/claude-code\n` +
      `  More info: https://docs.anthropic.com/claude/docs/claude-code-cli\n\n` +
      `━━━ OPTION 2: Use API Key ━━━\n` +
      `  Set ANTHROPIC_API_KEY in your .env file\n` +
      `  Or: Settings → LLM Providers → Claude → Use API\n`
  ) {
    super(message, null);
    this.name = 'CLINotFoundError';
    Object.setPrototypeOf(this, CLINotFoundError.prototype);
  }
}

// Default configuration values
const DEFAULT_CLAUDE_PATH = 'claude';
const DEFAULT_TIMEOUT = 300000; // 5 minutes
const DEFAULT_MAX_RETRIES = 2;

/**
 * Claude Code CLI client for using Claude via the CLI instead of direct API.
 * Allows using existing Claude subscription without separate API key.
 * Implements LLMClient interface for compatibility with LLMProvider.
 */
export class ClaudeCodeCLIClient implements LLMClient {
  private config: Required<Omit<ClaudeCodeCLIConfig, 'logger'>> & { logger?: Logger };

  constructor(config: ClaudeCodeCLIConfig = {}) {
    this.config = {
      claudePath: config.claudePath ?? DEFAULT_CLAUDE_PATH,
      workingDirectory: config.workingDirectory ?? process.cwd(),
      timeout: config.timeout ?? DEFAULT_TIMEOUT,
      maxRetries: config.maxRetries ?? DEFAULT_MAX_RETRIES,
      logger: config.logger,
      skipPermissions: config.skipPermissions ?? false,
    };
  }

  /**
   * Send a chat completion request via Claude Code CLI.
   * Uses --print flag for non-interactive output.
   */
  async chat(messages: Message[], options?: ChatOptions): Promise<LLMResponse> {
    const prompt = this.messagesToPrompt(messages);
    const systemPrompt = this.extractSystemPrompt(messages);

    const [args, stdinPrompt] = this.buildArgs(prompt, systemPrompt, options);
    const result = await this.executeWithRetry(args, stdinPrompt, options?.workingDirectory);

    return this.parseResponse(result, options);
  }

  /**
   * Stream a chat completion from Claude Code CLI.
   * Note: CLI doesn't support true streaming, so we execute and yield complete response.
   * Passes through workingDirectory from options if provided.
   */
  async *chatStream(
    messages: Message[],
    options?: ChatOptions
  ): AsyncGenerator<StreamChunk, void, unknown> {
    // CLI doesn't support true streaming, so we execute and yield at end
    // workingDirectory is passed through via options to chat()
    const response = await this.chat(messages, options);

    // Yield text content
    if (response.content) {
      yield { type: 'text', content: response.content };
    }

    // Yield tool calls if any
    if (response.toolCalls) {
      for (const toolCall of response.toolCalls) {
        yield { type: 'tool_use', toolCall };
      }
    }

    yield { type: 'done' };
  }

  /**
   * Approximate token count for content.
   * Uses ~4 characters per token approximation.
   */
  countTokens(content: string): number {
    if (!content || content.length === 0) return 0;
    return Math.ceil(content.length / 4);
  }

  /**
   * Execute a task with tools via Claude Code CLI.
   * Claude Code has built-in tools (Read, Write, Bash, etc.)
   * Passes through workingDirectory from options if provided.
   */
  async executeWithTools(
    messages: Message[],
    tools: ToolDefinition[],
    options?: ChatOptions
  ): Promise<LLMResponse> {
    const prompt = this.messagesToPrompt(messages);
    const systemPrompt = this.extractSystemPrompt(messages);

    const [args, stdinPrompt] = this.buildArgs(prompt, systemPrompt, options);

    // Add allowed tools flag if tools provided
    if (tools.length > 0) {
      // Remove any existing --allowedTools from buildArgs (it may have added from options.tools)
      const allowedToolsIdx = args.indexOf('--allowedTools');
      if (allowedToolsIdx !== -1) {
        args.splice(allowedToolsIdx, 2);
      }
      const cliToolNames = tools.map((t) => this.mapToolName(t.name));
      args.push('--allowedTools', cliToolNames.join(','));
    }

    const result = await this.executeWithRetry(args, stdinPrompt, options?.workingDirectory);
    return this.parseResponse(result, options);
  }

  /**
   * Continue an existing conversation by ID.
   * Uses --resume flag to continue from where the conversation left off.
   */
  async continueConversation(
    conversationId: string,
    message: string,
    options?: ChatOptions
  ): Promise<LLMResponse> {
    const args = ['--print', '--output-format', 'json'];

    // Resume existing conversation
    args.push('--resume', conversationId);

    // NOTE: Claude CLI doesn't support --max-tokens flag

    // Message passed via stdin to avoid shell escaping issues
    const result = await this.executeWithRetry(args, message);
    return this.parseResponse(result, options);
  }

  /**
   * Check if Claude CLI is available on the system.
   */
  async isAvailable(): Promise<boolean> {
    try {
      await this.execute(['--version']);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get Claude CLI version string.
   */
  async getVersion(): Promise<string> {
    const result = await this.execute(['--version']);
    return result.trim();
  }

  // ============ Private Methods ============

  /**
   * Build CLI arguments from options (prompt is passed via stdin).
   * Returns [args, prompt] tuple.
   */
  private buildArgs(prompt: string, system?: string, options?: ChatOptions): [string[], string] {
    const args = ['--print'];

    // Use JSON output for easier parsing
    args.push('--output-format', 'json');

    // NOTE: System prompt is NOT added to CLI args (too long, shell escaping issues)
    // Instead, it's prepended to stdin prompt below

    // NOTE: Claude CLI doesn't support --max-tokens flag
    // Token limits are managed by the CLI itself

    // Handle tools configuration
    if (options?.disableTools) {
      // Explicitly disable all tools for chat-only mode (e.g., interviews)
      // Use combined arg format for Windows shell compatibility
      args.push('--tools=""');
    } else {
      // Tools are enabled - add skip permissions flag for automated execution
      if (this.config.skipPermissions) {
        args.push('--dangerously-skip-permissions');
      }

      if (options?.tools && options.tools.length > 0) {
        // Specific tools requested
        const toolNames = this.mapToolNames(options.tools);
        args.push('--allowedTools', toolNames.join(','));
      }
    }
    // If neither disableTools nor tools specified, CLI uses default (all tools)

    // NOTE: Prompt is NOT added as positional arg anymore.
    // It will be passed via stdin to avoid shell escaping issues with newlines.
    // System prompt is also prepended to stdin (not CLI args) to avoid length issues.
    const stdinPrompt = system
      ? `<system>\n${system}\n</system>\n\n${prompt}`
      : prompt;
    return [args, stdinPrompt];
  }

  /**
   * Execute CLI command with retry logic.
   * @param args CLI arguments
   * @param stdinPrompt Optional prompt to pass via stdin (avoids shell escaping issues)
   * @param workingDirectory Optional per-call working directory override
   */
  private async executeWithRetry(args: string[], stdinPrompt?: string, workingDirectory?: string): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await this.execute(args, stdinPrompt, workingDirectory);
      } catch (error) {
        lastError = error as Error;
        this.config.logger?.warn(
          `CLI attempt ${attempt + 1}/${this.config.maxRetries + 1} failed: ${lastError.message}`
        );

        if (attempt < this.config.maxRetries) {
          // Exponential backoff
          const delay = 1000 * Math.pow(2, attempt);
          await this.sleep(delay);
        }
      }
    }

    throw lastError ?? new CLIError('Unknown CLI error');
  }

  /**
   * Execute the Claude CLI command.
   * @param args CLI arguments
   * @param stdinPrompt Optional prompt to pass via stdin (avoids shell escaping issues)
   * @param workingDirectory Optional per-call working directory override
   */
  private execute(args: string[], stdinPrompt?: string, workingDirectory?: string): Promise<string> {
    return new Promise((resolve, reject) => {
      // Use per-call override or fall back to config default
      const cwd = workingDirectory || this.config.workingDirectory;

      this.config.logger?.debug('Executing Claude CLI', { args: args.join(' '), cwd });

      // Enhanced debugging for troubleshooting
      console.log('[ClaudeCodeCLIClient] ========== DEBUG START ==========');
      console.log('[ClaudeCodeCLIClient] Full args:', args.join(' '));
      console.log('[ClaudeCodeCLIClient] Using stdin for prompt:', stdinPrompt ? 'YES' : 'NO');
      console.log('[ClaudeCodeCLIClient] Prompt length:', stdinPrompt?.length ?? 0);
      console.log('[ClaudeCodeCLIClient] Prompt preview:', stdinPrompt?.substring(0, 100) ?? 'N/A');
      console.log('[ClaudeCodeCLIClient] Config working dir:', this.config.workingDirectory);
      console.log('[ClaudeCodeCLIClient] Per-call override:', workingDirectory ?? 'NONE');
      console.log('[ClaudeCodeCLIClient] Resolved working dir:', cwd);
      console.log('[ClaudeCodeCLIClient] Shell mode:', process.platform === 'win32');
      console.log('[ClaudeCodeCLIClient] ========== DEBUG END ==========');

      const child = spawn(this.config.claudePath, args, {
        cwd: cwd,  // Use resolved cwd (per-call or config default)
        env: { ...process.env },
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: process.platform === 'win32', // Use shell on Windows for PATH resolution
      });

      console.log('[ClaudeCodeCLIClient] Process spawned, PID:', child.pid);

      // Write prompt to stdin if provided (avoids shell escaping issues with newlines)
      if (stdinPrompt && child.stdin) {
        child.stdin.write(stdinPrompt);
        child.stdin.end();
        console.log('[ClaudeCodeCLIClient] Prompt written to stdin and closed');
      }

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data: Buffer) => {
        const chunk = data.toString();
        stdout += chunk;
        console.log('[ClaudeCodeCLIClient] stdout chunk:', chunk.substring(0, 200));
      });

      child.stderr.on('data', (data: Buffer) => {
        const chunk = data.toString();
        stderr += chunk;
        console.log('[ClaudeCodeCLIClient] stderr chunk:', chunk.substring(0, 200));
      });

      // Timeout handling
      const timeout = setTimeout(() => {
        child.kill('SIGTERM');
        reject(new TimeoutError(`Claude CLI timed out after ${this.config.timeout}ms`));
      }, this.config.timeout);

      child.on('close', (code: number | null) => {
        clearTimeout(timeout);
        if (code === 0) {
          this.config.logger?.debug('Claude CLI completed successfully');
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

  /**
   * Convert messages array to a single prompt string.
   */
  private messagesToPrompt(messages: Message[]): string {
    return messages
      .filter((msg) => msg.role !== 'system') // System handled separately
      .map((msg) => {
        if (msg.role === 'user') {
          return `Human: ${msg.content}`;
        } else if (msg.role === 'assistant') {
          return `Assistant: ${msg.content}`;
        } else if (msg.role === 'tool' && msg.toolResults) {
          // Format tool results
          const results = msg.toolResults
            .map((r) => `Tool ${r.toolCallId}: ${JSON.stringify(r.result)}`)
            .join('\n');
          return `Tool Results:\n${results}`;
        }
        return msg.content;
      })
      .join('\n\n');
  }

  /**
   * Extract system prompt from messages.
   */
  private extractSystemPrompt(messages: Message[]): string | undefined {
    const systemMsg = messages.find((msg) => msg.role === 'system');
    return systemMsg?.content;
  }

  /**
   * Parse CLI output to LLMResponse.
   */
  private parseResponse(result: string, _options?: ChatOptions): LLMResponse {
    try {
      // Try to parse as JSON first (if --output-format json was used)
      const json = JSON.parse(result) as Record<string, unknown>;

      const content =
        (json.result as string) ||
        (json.response as string) ||
        (json.content as string) ||
        result;

      const usage: TokenUsage = {
        inputTokens: Number(json.inputTokens ?? json.input_tokens ?? 0),
        outputTokens: Number(json.outputTokens ?? json.output_tokens ?? 0),
        totalTokens: 0,
      };
      usage.totalTokens = usage.inputTokens + usage.outputTokens;

      // Determine finish reason
      let finishReason: FinishReason = 'stop';
      const stopReason = json.stopReason ?? json.stop_reason;
      if (stopReason === 'tool_use') {
        finishReason = 'tool_use';
      } else if (stopReason === 'max_tokens') {
        finishReason = 'max_tokens';
      }

      // Check for tool calls in response
      const toolCalls = this.extractToolCalls(json);

      return {
        content: typeof content === 'string' ? content : JSON.stringify(content),
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        usage,
        finishReason: toolCalls.length > 0 ? 'tool_use' : finishReason,
      };
    } catch {
      // Plain text response
      return {
        content: result.trim(),
        usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
        finishReason: 'stop',
      };
    }
  }

  /**
   * Extract tool calls from JSON response if present.
   */
  private extractToolCalls(json: Record<string, unknown>): Array<{
    id: string;
    name: string;
    arguments: Record<string, unknown>;
  }> {
    const toolCalls: Array<{ id: string; name: string; arguments: Record<string, unknown> }> = [];

    // Check for tool_calls array in response
    if (Array.isArray(json.tool_calls)) {
      for (const tc of json.tool_calls) {
        if (tc && typeof tc === 'object') {
          const call = tc as Record<string, unknown>;
          toolCalls.push({
            id: typeof call.id === 'string' ? call.id : `cli_tool_${Date.now()}`,
            name: call.name as string,
            arguments: (call.arguments ?? call.input ?? {}) as Record<string, unknown>,
          });
        }
      }
    }

    return toolCalls;
  }

  /**
   * Map a single Nexus tool name to Claude Code CLI tool name.
   */
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

  /**
   * Map Nexus tool names to Claude Code CLI tool names.
   */
  private mapToolNames(tools: ToolDefinition[]): string[] {
    return tools.map((t) => this.mapToolName(t.name));
  }

  /**
   * Generate tool hints string for prompt enhancement.
   */
  private toolsToHints(tools: ToolDefinition[]): string {
    return tools.map((t) => `${t.name}: ${t.description}`).join(', ');
  }

  /**
   * Sleep utility for retry delays.
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
