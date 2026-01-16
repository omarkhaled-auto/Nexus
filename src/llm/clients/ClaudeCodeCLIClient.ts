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
 * Error when Claude CLI is not available
 */
export class CLINotFoundError extends CLIError {
  constructor(message: string = 'Claude CLI not found. Ensure claude is installed and in PATH.') {
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
    };
  }

  /**
   * Send a chat completion request via Claude Code CLI.
   * Uses --print flag for non-interactive output.
   */
  async chat(messages: Message[], options?: ChatOptions): Promise<LLMResponse> {
    const prompt = this.messagesToPrompt(messages);
    const systemPrompt = this.extractSystemPrompt(messages);

    const args = this.buildArgs(prompt, systemPrompt, options);
    const result = await this.executeWithRetry(args);

    return this.parseResponse(result, options);
  }

  /**
   * Stream a chat completion from Claude Code CLI.
   * Note: CLI doesn't support true streaming, so we execute and yield complete response.
   */
  async *chatStream(
    messages: Message[],
    options?: ChatOptions
  ): AsyncGenerator<StreamChunk, void, unknown> {
    // CLI doesn't support true streaming, so we execute and yield at end
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
   */
  async executeWithTools(
    messages: Message[],
    tools: ToolDefinition[],
    options?: ChatOptions
  ): Promise<LLMResponse> {
    const prompt = this.messagesToPrompt(messages);
    const systemPrompt = this.extractSystemPrompt(messages);

    const args = this.buildArgs(prompt, systemPrompt, options);

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

    const result = await this.executeWithRetry(args);
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
    args.push('--message', message);

    if (options?.maxTokens) {
      args.push('--max-tokens', String(options.maxTokens));
    }

    const result = await this.executeWithRetry(args);
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
   * Build CLI arguments from prompt and options.
   */
  private buildArgs(prompt: string, system?: string, options?: ChatOptions): string[] {
    const args = ['--print'];

    // Use JSON output for easier parsing
    args.push('--output-format', 'json');

    // System prompt
    if (system) {
      args.push('--system-prompt', system);
    }

    // Max tokens
    if (options?.maxTokens) {
      args.push('--max-tokens', String(options.maxTokens));
    }

    // Add tools configuration if provided
    if (options?.tools && options.tools.length > 0) {
      const toolNames = this.mapToolNames(options.tools);
      args.push('--allowedTools', toolNames.join(','));
    }

    // The prompt itself (must be last)
    args.push('--message', prompt);

    return args;
  }

  /**
   * Execute CLI command with retry logic.
   */
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
   */
  private execute(args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      this.config.logger?.debug('Executing Claude CLI', { args: args.join(' ') });

      const child = spawn(this.config.claudePath, args, {
        cwd: this.config.workingDirectory,
        env: { ...process.env },
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: process.platform === 'win32', // Use shell on Windows for PATH resolution
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
        inputTokens: (json.inputTokens as number) ?? (json.input_tokens as number) ?? 0,
        outputTokens: (json.outputTokens as number) ?? (json.output_tokens as number) ?? 0,
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
            id: (call.id as string) ?? `cli_tool_${Date.now()}`,
            name: call.name as string,
            arguments: (call.arguments as Record<string, unknown>) ?? (call.input as Record<string, unknown>) ?? {},
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
