/**
 * GeminiCLIClient - Gemini CLI client for using Gemini via the CLI instead of direct API
 * Phase 16: Full CLI Support Integration
 *
 * Based on Gemini CLI research (version 0.24.0):
 * - JSON output: `-o json` returns `{"session_id":"...","response":"...","stats":{...}}`
 * - Streaming: `-o stream-json` returns NDJSON format
 * - Non-interactive: `--yolo` flag
 * - Model selection: `-m, --model gemini-2.5-pro`
 *
 * Key differences from ClaudeCodeCLIClient:
 * - Non-interactive: `--yolo` (not `--print`)
 * - JSON output: `-o json` (not `--output-format json`)
 * - Prompt: Positional argument (not `--message`)
 * - No `--system-prompt` support (prepend to prompt)
 */

import { spawn, type ChildProcess } from 'child_process';
import type {
  Message,
  ChatOptions,
  LLMResponse,
  StreamChunk,
  TokenUsage,
  LLMClient,
  FinishReason,
} from '../types';
import { LLMError } from './ClaudeClient';
import type {
  GeminiCLIConfig,
  GeminiCLIRawResponse,
  GeminiStreamChunk,
  GeminiCLIErrorCode,
} from './GeminiCLIClient.types';
import { DEFAULT_GEMINI_CLI_CONFIG, GEMINI_ERROR_PATTERNS } from './GeminiCLIClient.types';

// ============================================================================
// Error Classes
// ============================================================================

/**
 * Error specific to Gemini CLI execution failures
 */
export class GeminiCLIError extends LLMError {
  exitCode: number | null;
  errorCode: GeminiCLIErrorCode;

  constructor(
    message: string,
    exitCode: number | null = null,
    errorCode: GeminiCLIErrorCode = 'UNKNOWN'
  ) {
    super(message);
    this.name = 'GeminiCLIError';
    this.exitCode = exitCode;
    this.errorCode = errorCode;
    Object.setPrototypeOf(this, GeminiCLIError.prototype);
  }
}

/**
 * Error when Gemini CLI is not available
 */
export class GeminiCLINotFoundError extends GeminiCLIError {
  constructor(
    message: string = `Gemini CLI not found. You have two options:\n\n` +
      `1. Install Gemini CLI:\n` +
      `   npm install -g @anthropic-ai/gemini-cli\n` +
      `   (or visit: https://ai.google.dev/gemini-api/docs/cli)\n\n` +
      `2. Use API key instead:\n` +
      `   Set GOOGLE_AI_API_KEY in your .env file\n` +
      `   Or configure in Settings > LLM Providers > Gemini > Use API\n`
  ) {
    super(message, null, 'CLI_NOT_FOUND');
    this.name = 'GeminiCLINotFoundError';
    Object.setPrototypeOf(this, GeminiCLINotFoundError.prototype);
  }
}

/**
 * Error when Gemini CLI authentication fails
 */
export class GeminiCLIAuthError extends GeminiCLIError {
  constructor(
    message: string = `Gemini CLI authentication failed. Options:\n\n` +
      `1. Authenticate with gcloud:\n` +
      `   gcloud auth application-default login\n\n` +
      `2. Use API key instead:\n` +
      `   Set GOOGLE_AI_API_KEY in your .env file\n`
  ) {
    super(message, null, 'AUTH_FAILED');
    this.name = 'GeminiCLIAuthError';
    Object.setPrototypeOf(this, GeminiCLIAuthError.prototype);
  }
}

/**
 * Error when Gemini CLI request times out
 */
export class GeminiCLITimeoutError extends GeminiCLIError {
  constructor(timeout: number) {
    super(
      `Gemini CLI request timed out after ${timeout / 1000} seconds.\n` +
        `Try increasing timeout in Settings > LLM Providers > Gemini > Timeout`,
      null,
      'TIMEOUT'
    );
    this.name = 'GeminiCLITimeoutError';
    Object.setPrototypeOf(this, GeminiCLITimeoutError.prototype);
  }
}

// ============================================================================
// Main Client Class
// ============================================================================

/**
 * Gemini CLI client for using Gemini via the CLI instead of direct API.
 * Allows using existing gcloud authentication without separate API key.
 * Implements LLMClient interface for compatibility with LLMProvider.
 */
export class GeminiCLIClient implements LLMClient {
  private config: Required<Omit<GeminiCLIConfig, 'additionalFlags' | 'logger'>> & {
    additionalFlags: string[];
    logger?: GeminiCLIConfig['logger'];
  };

  constructor(config: GeminiCLIConfig = {}) {
    this.config = {
      cliPath: config.cliPath ?? DEFAULT_GEMINI_CLI_CONFIG.cliPath,
      workingDirectory: config.workingDirectory ?? DEFAULT_GEMINI_CLI_CONFIG.workingDirectory,
      timeout: config.timeout ?? DEFAULT_GEMINI_CLI_CONFIG.timeout,
      maxRetries: config.maxRetries ?? DEFAULT_GEMINI_CLI_CONFIG.maxRetries,
      model: config.model ?? DEFAULT_GEMINI_CLI_CONFIG.model,
      additionalFlags: config.additionalFlags ?? [],
      logger: config.logger,
    };
  }

  // ============================================================================
  // Public LLMClient Interface Methods
  // ============================================================================

  /**
   * Send a chat completion request via Gemini CLI.
   * Uses --yolo flag for non-interactive output.
   */
  async chat(messages: Message[], options?: ChatOptions): Promise<LLMResponse> {
    const prompt = this.messagesToPrompt(messages);
    const args = this.buildArgs(prompt, options);
    const result = await this.executeWithRetry(args);

    return this.parseResponse(result);
  }

  /**
   * Stream a chat completion from Gemini CLI.
   * Uses `-o stream-json` for NDJSON streaming.
   */
  async *chatStream(
    messages: Message[],
    options?: ChatOptions
  ): AsyncGenerator<StreamChunk, void, unknown> {
    const prompt = this.messagesToPrompt(messages);
    const args = this.buildStreamArgs(prompt, options);

    try {
      for await (const chunk of this.executeStream(args)) {
        if (chunk.type === 'message' && chunk.role === 'assistant') {
          yield { type: 'text', content: chunk.content };
        } else if (chunk.type === 'error') {
          yield { type: 'error', error: chunk.error };
        }
      }
      yield { type: 'done' };
    } catch (error) {
      // If streaming fails, fall back to non-streaming
      this.config.logger?.warn('Streaming failed, falling back to non-streaming', {
        error: (error as Error).message,
      });
      const response = await this.chat(messages, options);
      if (response.content) {
        yield { type: 'text', content: response.content };
      }
      yield { type: 'done' };
    }
  }

  /**
   * Approximate token count for content.
   * Uses ~4 characters per token approximation.
   */
  countTokens(content: string): number {
    if (!content || content.length === 0) return 0;
    return Math.ceil(content.length / 4);
  }

  // ============================================================================
  // Additional Public Methods
  // ============================================================================

  /**
   * Check if Gemini CLI is available on the system.
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
   * Get Gemini CLI version string.
   */
  async getVersion(): Promise<string> {
    const result = await this.execute(['--version']);
    return result.trim();
  }

  /**
   * Get the current configuration.
   */
  getConfig(): Readonly<typeof this.config> {
    return { ...this.config };
  }

  // ============================================================================
  // Private Methods - Argument Building
  // ============================================================================

  /**
   * Build CLI arguments for non-streaming request.
   */
  private buildArgs(prompt: string, _options?: ChatOptions): string[] {
    const args: string[] = [];

    // Non-interactive mode
    args.push('--yolo');

    // JSON output for easier parsing
    args.push('-o', 'json');

    // Model selection
    args.push('-m', this.config.model);

    // Add any additional flags from config
    args.push(...this.config.additionalFlags);

    // The prompt itself (must be last, positional argument)
    args.push(prompt);

    return args;
  }

  /**
   * Build CLI arguments for streaming request.
   */
  private buildStreamArgs(prompt: string, _options?: ChatOptions): string[] {
    const args: string[] = [];

    // Non-interactive mode
    args.push('--yolo');

    // Streaming JSON output (NDJSON format)
    args.push('-o', 'stream-json');

    // Model selection
    args.push('-m', this.config.model);

    // Add any additional flags from config
    args.push(...this.config.additionalFlags);

    // The prompt itself (must be last, positional argument)
    args.push(prompt);

    return args;
  }

  // ============================================================================
  // Private Methods - Message Conversion
  // ============================================================================

  /**
   * Convert messages array to a single prompt string.
   * Gemini CLI doesn't support --system-prompt, so we prepend it to the prompt.
   */
  private messagesToPrompt(messages: Message[]): string {
    const parts: string[] = [];

    // Extract and prepend system prompt if present
    const systemMsg = messages.find((msg) => msg.role === 'system');
    if (systemMsg) {
      parts.push(`[System Instructions]\n${systemMsg.content}\n[End System Instructions]\n`);
    }

    // Convert other messages
    const conversationParts = messages
      .filter((msg) => msg.role !== 'system')
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
      });

    parts.push(...conversationParts);

    return parts.join('\n\n');
  }

  // ============================================================================
  // Private Methods - Response Parsing
  // ============================================================================

  /**
   * Parse CLI JSON output to LLMResponse.
   */
  private parseResponse(result: string): LLMResponse {
    try {
      const json = JSON.parse(result) as GeminiCLIRawResponse;

      // Extract content from response field
      const content = json.response || '';

      // Extract token usage from nested stats structure
      const modelStats = Object.values(json.stats?.models || {})[0];
      const tokens = modelStats?.tokens;

      const usage: TokenUsage = {
        inputTokens: tokens?.input ?? tokens?.prompt ?? 0,
        outputTokens: tokens?.candidates ?? 0,
        totalTokens: tokens?.total ?? 0,
        thinkingTokens: tokens?.thoughts,
      };

      // If total is 0 but we have input/output, calculate it
      if (usage.totalTokens === 0 && (usage.inputTokens > 0 || usage.outputTokens > 0)) {
        usage.totalTokens = usage.inputTokens + usage.outputTokens;
      }

      const finishReason: FinishReason = 'stop';

      return {
        content: typeof content === 'string' ? content : JSON.stringify(content),
        usage,
        finishReason,
      };
    } catch {
      // Plain text response fallback
      return {
        content: result.trim(),
        usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
        finishReason: 'stop',
      };
    }
  }

  // ============================================================================
  // Private Methods - CLI Execution
  // ============================================================================

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
          `Gemini CLI attempt ${attempt + 1}/${this.config.maxRetries + 1} failed: ${lastError.message}`
        );

        // Check if error is retriable
        if (!this.isRetriableError(lastError)) {
          throw this.wrapError(lastError);
        }

        if (attempt < this.config.maxRetries) {
          // Exponential backoff: 1s, 2s, 4s...
          const delay = 1000 * Math.pow(2, attempt);
          await this.sleep(delay);
        }
      }
    }

    throw this.wrapError(lastError ?? new GeminiCLIError('Unknown Gemini CLI error'));
  }

  /**
   * Execute the Gemini CLI command.
   */
  private execute(args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      this.config.logger?.debug('Executing Gemini CLI', { args: args.join(' ') });

      const child = spawn(this.config.cliPath, args, {
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
        reject(new GeminiCLITimeoutError(this.config.timeout));
      }, this.config.timeout);

      child.on('close', (code: number | null) => {
        clearTimeout(timeout);
        if (code === 0) {
          this.config.logger?.debug('Gemini CLI completed successfully');
          resolve(stdout);
        } else {
          const error = new GeminiCLIError(
            `Gemini CLI exited with code ${String(code)}: ${stderr}`,
            code
          );
          reject(this.wrapError(error));
        }
      });

      child.on('error', (error: Error) => {
        clearTimeout(timeout);
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          reject(new GeminiCLINotFoundError());
        } else {
          reject(new GeminiCLIError(`Failed to spawn Gemini CLI: ${error.message}`));
        }
      });
    });
  }

  /**
   * Execute the Gemini CLI command with streaming output.
   */
  private async *executeStream(args: string[]): AsyncGenerator<GeminiStreamChunk, void, unknown> {
    this.config.logger?.debug('Executing Gemini CLI with streaming', { args: args.join(' ') });

    const child: ChildProcess = spawn(this.config.cliPath, args, {
      cwd: this.config.workingDirectory,
      env: { ...process.env },
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: process.platform === 'win32',
    });

    let buffer = '';
    let stderr = '';
    let processEnded = false;
    let exitCode: number | null = null;

    // Collect stderr for error reporting
    child.stderr?.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    // Create a promise that resolves when process ends
    const processEndPromise = new Promise<void>((resolve) => {
      child.on('close', (code) => {
        processEnded = true;
        exitCode = code;
        resolve();
      });

      child.on('error', (error) => {
        processEnded = true;
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          throw new GeminiCLINotFoundError();
        }
        throw new GeminiCLIError(`Failed to spawn Gemini CLI: ${error.message}`);
      });
    });

    // Timeout handling
    const timeoutId = setTimeout(() => {
      child.kill('SIGTERM');
      throw new GeminiCLITimeoutError(this.config.timeout);
    }, this.config.timeout);

    try {
      // Process stdout chunks
      for await (const data of child.stdout as AsyncIterable<Buffer>) {
        buffer += data.toString();

        // Process complete NDJSON lines
        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          const line = buffer.slice(0, newlineIndex).trim();
          buffer = buffer.slice(newlineIndex + 1);

          if (line) {
            try {
              const chunk = JSON.parse(line) as GeminiStreamChunk;
              yield chunk;
            } catch {
              // Skip invalid JSON lines (may be debug output)
              this.config.logger?.debug('Skipped non-JSON line in stream', { line });
            }
          }
        }
      }

      // Wait for process to fully end
      await processEndPromise;

      // Check exit code after stream ends
      if (exitCode !== 0) {
        throw new GeminiCLIError(`Gemini CLI exited with code ${exitCode !== null ? String(exitCode) : 'unknown'}: ${stderr}`, exitCode);
      }
    } finally {
      clearTimeout(timeoutId);

      // FIX: Always ensure process is killed on early termination
      if (!processEnded && child.exitCode === null) {
        child.kill('SIGTERM');

        // Give it a moment, then force kill if needed
        setTimeout(() => {
          if (child.exitCode === null) {
            child.kill('SIGKILL');
          }
        }, 1000);
      }
    }
  }

  // ============================================================================
  // Private Methods - Error Handling
  // ============================================================================

  /**
   * Check if an error is retriable.
   */
  private isRetriableError(error: Error): boolean {
    const message = error.message.toLowerCase();

    // Check against known error patterns
    for (const pattern of GEMINI_ERROR_PATTERNS) {
      if (pattern.pattern.test(message)) {
        return pattern.retriable;
      }
    }

    // Default: retry on unknown errors (might be transient)
    return true;
  }

  /**
   * Wrap generic errors in specific error classes.
   */
  private wrapError(error: Error): Error {
    const message = error.message.toLowerCase();

    // Check for CLI not found
    if (
      message.includes('enoent') ||
      message.includes('not found') ||
      message.includes('command not found')
    ) {
      return new GeminiCLINotFoundError();
    }

    // Check for auth errors
    if (
      message.includes('auth') ||
      message.includes('credentials') ||
      message.includes('permission denied') ||
      message.includes('401')
    ) {
      return new GeminiCLIAuthError();
    }

    // Check for timeout
    if (message.includes('timeout') || message.includes('timed out')) {
      return new GeminiCLITimeoutError(this.config.timeout);
    }

    // Return original error if already a GeminiCLIError
    if (error instanceof GeminiCLIError) {
      return error;
    }

    // Wrap in generic GeminiCLIError
    return new GeminiCLIError(error.message);
  }

  // ============================================================================
  // Private Methods - Utilities
  // ============================================================================

  /**
   * Sleep utility for retry delays.
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
