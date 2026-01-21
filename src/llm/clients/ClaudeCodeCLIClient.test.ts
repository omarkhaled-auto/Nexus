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

/**
 * Create a mock child process with configurable behavior
 */
function createMockChildProcess(options: {
  stdout?: string;
  stderr?: string;
  exitCode?: number | null;
  error?: Error;
  delay?: number;
}) {
  const mockStdout = new EventEmitter();
  const mockStderr = new EventEmitter();
  // Create mock stdin with write and end methods to capture what's written
  const stdinData: string[] = [];
  const mockStdin = {
    write: vi.fn((data: string) => { stdinData.push(data); }),
    end: vi.fn(),
    data: stdinData,
  };
  const mockProcess = new EventEmitter() as EventEmitter & {
    stdout: EventEmitter;
    stderr: EventEmitter;
    stdin: typeof mockStdin;
    kill: ReturnType<typeof vi.fn>;
  };
  mockProcess.stdout = mockStdout;
  mockProcess.stderr = mockStderr;
  mockProcess.stdin = mockStdin;
  mockProcess.kill = vi.fn();

  // Schedule events
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

describe('ClaudeCodeCLIClient', () => {
  let mockSpawn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSpawn = vi.mocked(spawn);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should use default values when no config provided', () => {
      const client = new ClaudeCodeCLIClient();
      expect(client).toBeDefined();
    });

    it('should accept custom claude path', () => {
      const client = new ClaudeCodeCLIClient({
        claudePath: '/usr/local/bin/claude',
      });
      expect(client).toBeDefined();
    });

    it('should accept custom timeout', () => {
      const client = new ClaudeCodeCLIClient({
        timeout: 60000,
      });
      expect(client).toBeDefined();
    });

    it('should accept custom working directory', () => {
      const client = new ClaudeCodeCLIClient({
        workingDirectory: '/tmp',
      });
      expect(client).toBeDefined();
    });

    it('should accept max retries configuration', () => {
      const client = new ClaudeCodeCLIClient({
        maxRetries: 5,
      });
      expect(client).toBeDefined();
    });

    it('should accept logger', () => {
      const logger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };
      const client = new ClaudeCodeCLIClient({ logger });
      expect(client).toBeDefined();
    });
  });

  describe('isAvailable()', () => {
    it('should return true if claude CLI exists', async () => {
      const client = new ClaudeCodeCLIClient();
      mockSpawn.mockReturnValue(
        createMockChildProcess({
          stdout: 'claude version 1.0.0',
          exitCode: 0,
        })
      );

      const available = await client.isAvailable();

      expect(available).toBe(true);
    });

    it('should return false if claude CLI is not found', async () => {
      const client = new ClaudeCodeCLIClient();
      const error = new Error('ENOENT') as NodeJS.ErrnoException;
      error.code = 'ENOENT';
      mockSpawn.mockReturnValue(createMockChildProcess({ error }));

      const available = await client.isAvailable();

      expect(available).toBe(false);
    });

    it('should return false if claude CLI fails', async () => {
      const client = new ClaudeCodeCLIClient();
      mockSpawn.mockReturnValue(
        createMockChildProcess({
          stderr: 'Error',
          exitCode: 1,
        })
      );

      const available = await client.isAvailable();

      expect(available).toBe(false);
    });
  });

  describe('getVersion()', () => {
    it('should return version string', async () => {
      const client = new ClaudeCodeCLIClient();
      mockSpawn.mockReturnValue(
        createMockChildProcess({
          stdout: 'claude version 1.2.3',
          exitCode: 0,
        })
      );

      const version = await client.getVersion();

      expect(version).toBe('claude version 1.2.3');
    });
  });

  describe('chat()', () => {
    it('should convert messages to prompt format and send via stdin', async () => {
      const client = new ClaudeCodeCLIClient();
      const mockProcess = createMockChildProcess({
        stdout: '{"result": "Hello!"}',
        exitCode: 0,
      });
      mockSpawn.mockReturnValue(mockProcess);

      const messages: Message[] = [{ role: 'user', content: 'Hi' }];
      await client.chat(messages);

      // Prompt should be written to stdin, not passed as arg
      expect(mockProcess.stdin.write).toHaveBeenCalled();
      expect(mockProcess.stdin.data.join('')).toContain('Human: Hi');
      expect(mockProcess.stdin.end).toHaveBeenCalled();
    });

    it('should include --print and --output-format json flags', async () => {
      const client = new ClaudeCodeCLIClient();
      mockSpawn.mockReturnValue(
        createMockChildProcess({
          stdout: '{"result": "Hello!"}',
          exitCode: 0,
        })
      );

      await client.chat([{ role: 'user', content: 'Hi' }]);

      expect(mockSpawn).toHaveBeenCalledWith(
        'claude',
        expect.arrayContaining(['--print', '--output-format', 'json']),
        expect.any(Object)
      );
    });

    it('should parse JSON response correctly', async () => {
      const client = new ClaudeCodeCLIClient();
      mockSpawn.mockReturnValue(
        createMockChildProcess({
          stdout: '{"result": "Hello!", "inputTokens": 10, "outputTokens": 5}',
          exitCode: 0,
        })
      );

      const response = await client.chat([{ role: 'user', content: 'Hi' }]);

      expect(response.content).toBe('Hello!');
      expect(response.usage.inputTokens).toBe(10);
      expect(response.usage.outputTokens).toBe(5);
      expect(response.finishReason).toBe('stop');
    });

    it('should handle plain text response', async () => {
      const client = new ClaudeCodeCLIClient();
      mockSpawn.mockReturnValue(
        createMockChildProcess({
          stdout: 'Just plain text response',
          exitCode: 0,
        })
      );

      const response = await client.chat([{ role: 'user', content: 'Hi' }]);

      expect(response.content).toBe('Just plain text response');
      expect(response.usage.inputTokens).toBe(0);
      expect(response.usage.outputTokens).toBe(0);
    });

    it('should pass system prompt when present', async () => {
      const client = new ClaudeCodeCLIClient();
      mockSpawn.mockReturnValue(
        createMockChildProcess({
          stdout: '{"result": "OK"}',
          exitCode: 0,
        })
      );

      const messages: Message[] = [
        { role: 'system', content: 'You are a helpful assistant' },
        { role: 'user', content: 'Hi' },
      ];
      await client.chat(messages);

      expect(mockSpawn).toHaveBeenCalledWith(
        'claude',
        expect.arrayContaining(['--system-prompt', 'You are a helpful assistant']),
        expect.any(Object)
      );
    });

    it('should pass max tokens option', async () => {
      const client = new ClaudeCodeCLIClient();
      mockSpawn.mockReturnValue(
        createMockChildProcess({
          stdout: '{"result": "OK"}',
          exitCode: 0,
        })
      );

      const options: ChatOptions = { maxTokens: 2000 };
      await client.chat([{ role: 'user', content: 'Hi' }], options);

      expect(mockSpawn).toHaveBeenCalledWith(
        'claude',
        expect.arrayContaining(['--max-tokens', '2000']),
        expect.any(Object)
      );
    });

    it('should handle multi-turn conversation via stdin', async () => {
      const client = new ClaudeCodeCLIClient();
      const mockProcess = createMockChildProcess({
        stdout: '{"result": "I remember you said hello!"}',
        exitCode: 0,
      });
      mockSpawn.mockReturnValue(mockProcess);

      const messages: Message[] = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' },
        { role: 'user', content: 'What did I say?' },
      ];
      await client.chat(messages);

      // Prompt should be written to stdin
      expect(mockProcess.stdin.write).toHaveBeenCalled();
      expect(mockProcess.stdin.data.join('')).toContain('Human: Hello');
    });
  });

  describe('chat() with tools', () => {
    it('should map Nexus tools to Claude CLI tools', async () => {
      const client = new ClaudeCodeCLIClient();
      mockSpawn.mockReturnValue(
        createMockChildProcess({
          stdout: '{"result": "Done"}',
          exitCode: 0,
        })
      );

      const tools: ToolDefinition[] = [
        {
          name: 'write_file',
          description: 'Write to file',
          inputSchema: { type: 'object' },
        },
      ];
      await client.chat([{ role: 'user', content: 'Write a file' }], { tools });

      expect(mockSpawn).toHaveBeenCalledWith(
        'claude',
        expect.arrayContaining(['--allowedTools', expect.stringContaining('Write')]),
        expect.any(Object)
      );
    });

    it('should map read_file to Read', async () => {
      const client = new ClaudeCodeCLIClient();
      mockSpawn.mockReturnValue(
        createMockChildProcess({
          stdout: '{"result": "file content"}',
          exitCode: 0,
        })
      );

      const tools: ToolDefinition[] = [
        {
          name: 'read_file',
          description: 'Read a file',
          inputSchema: { type: 'object' },
        },
      ];
      await client.chat([{ role: 'user', content: 'Read a file' }], { tools });

      expect(mockSpawn).toHaveBeenCalledWith(
        'claude',
        expect.arrayContaining(['--allowedTools', 'Read']),
        expect.any(Object)
      );
    });

    it('should pass through unknown tool names', async () => {
      const client = new ClaudeCodeCLIClient();
      mockSpawn.mockReturnValue(
        createMockChildProcess({
          stdout: '{"result": "Done"}',
          exitCode: 0,
        })
      );

      const tools: ToolDefinition[] = [
        {
          name: 'custom_tool',
          description: 'A custom tool',
          inputSchema: { type: 'object' },
        },
      ];
      await client.chat([{ role: 'user', content: 'Use custom tool' }], { tools });

      expect(mockSpawn).toHaveBeenCalledWith(
        'claude',
        expect.arrayContaining(['--allowedTools', 'custom_tool']),
        expect.any(Object)
      );
    });

    it('should disable all tools when disableTools is true', async () => {
      const client = new ClaudeCodeCLIClient();
      mockSpawn.mockReturnValue(
        createMockChildProcess({
          stdout: '{"result": "Chat response"}',
          exitCode: 0,
        })
      );

      // Use disableTools for chat-only mode (e.g., interviews)
      await client.chat([{ role: 'user', content: 'Just chat' }], { disableTools: true });

      expect(mockSpawn).toHaveBeenCalledWith(
        'claude',
        expect.arrayContaining(['--tools', '']),
        expect.any(Object)
      );
    });

    it('should use default tools when neither tools nor disableTools specified', async () => {
      const client = new ClaudeCodeCLIClient();
      mockSpawn.mockReturnValue(
        createMockChildProcess({
          stdout: '{"result": "Response"}',
          exitCode: 0,
        })
      );

      await client.chat([{ role: 'user', content: 'Hello' }]);

      // Should NOT have --tools or --allowedTools in args
      const callArgs = mockSpawn.mock.calls[0][1] as string[];
      expect(callArgs).not.toContain('--tools');
      expect(callArgs).not.toContain('--allowedTools');
    });
  });

  describe('retry logic', () => {
    it('should retry on failure', async () => {
      const client = new ClaudeCodeCLIClient({ maxRetries: 2 });

      let callCount = 0;
      mockSpawn.mockImplementation(() => {
        callCount++;
        if (callCount < 2) {
          return createMockChildProcess({
            stderr: 'Temporary error',
            exitCode: 1,
          });
        }
        return createMockChildProcess({
          stdout: '{"result": "OK"}',
          exitCode: 0,
        });
      });

      const response = await client.chat([{ role: 'user', content: 'Hi' }]);

      expect(callCount).toBe(2);
      expect(response.content).toBe('OK');
    });

    it('should throw after max retries exceeded', async () => {
      // Use maxRetries: 0 to avoid exponential backoff delays in tests
      const client = new ClaudeCodeCLIClient({ maxRetries: 0 });
      mockSpawn.mockReturnValue(
        createMockChildProcess({
          stderr: 'Always fails',
          exitCode: 1,
        })
      );

      await expect(client.chat([{ role: 'user', content: 'Hi' }])).rejects.toThrow(
        CLIError
      );
    });
  });

  describe('error handling', () => {
    it('should throw CLINotFoundError when claude is not installed', async () => {
      const client = new ClaudeCodeCLIClient({ maxRetries: 0 });
      const error = new Error('ENOENT') as NodeJS.ErrnoException;
      error.code = 'ENOENT';
      mockSpawn.mockReturnValue(createMockChildProcess({ error }));

      await expect(client.chat([{ role: 'user', content: 'Hi' }])).rejects.toThrow(
        CLINotFoundError
      );
    });

    it('should throw CLIError with exit code on non-zero exit', async () => {
      const client = new ClaudeCodeCLIClient({ maxRetries: 0 });
      mockSpawn.mockReturnValue(
        createMockChildProcess({
          stderr: 'Some error',
          exitCode: 42,
        })
      );

      try {
        await client.chat([{ role: 'user', content: 'Hi' }]);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(CLIError);
        expect((error as CLIError).exitCode).toBe(42);
      }
    });

    it('should throw TimeoutError when CLI times out', async () => {
      const client = new ClaudeCodeCLIClient({ timeout: 50, maxRetries: 0 });

      // Create a mock that never resolves
      const mockProcess = new EventEmitter() as EventEmitter & {
        stdout: EventEmitter;
        stderr: EventEmitter;
        kill: ReturnType<typeof vi.fn>;
      };
      mockProcess.stdout = new EventEmitter();
      mockProcess.stderr = new EventEmitter();
      mockProcess.kill = vi.fn();
      mockSpawn.mockReturnValue(mockProcess);

      await expect(client.chat([{ role: 'user', content: 'Hi' }])).rejects.toThrow(
        TimeoutError
      );

      expect(mockProcess.kill).toHaveBeenCalledWith('SIGTERM');
    });
  });

  describe('chatStream()', () => {
    it('should yield text content', async () => {
      const client = new ClaudeCodeCLIClient();
      mockSpawn.mockReturnValue(
        createMockChildProcess({
          stdout: '{"result": "Hello from CLI!"}',
          exitCode: 0,
        })
      );

      const chunks: string[] = [];
      for await (const chunk of client.chatStream([{ role: 'user', content: 'Hi' }])) {
        if (chunk.type === 'text' && chunk.content) {
          chunks.push(chunk.content);
        }
      }

      expect(chunks).toContain('Hello from CLI!');
    });

    it('should yield done chunk at the end', async () => {
      const client = new ClaudeCodeCLIClient();
      mockSpawn.mockReturnValue(
        createMockChildProcess({
          stdout: '{"result": "Done"}',
          exitCode: 0,
        })
      );

      const types: string[] = [];
      for await (const chunk of client.chatStream([{ role: 'user', content: 'Hi' }])) {
        types.push(chunk.type);
      }

      expect(types[types.length - 1]).toBe('done');
    });
  });

  describe('countTokens()', () => {
    it('should return approximate count (~4 chars per token)', () => {
      const client = new ClaudeCodeCLIClient();
      const content = 'Hello, world!'; // 13 chars
      const count = client.countTokens(content);

      // ~4 chars per token = ~3-4 tokens
      expect(count).toBeGreaterThanOrEqual(3);
      expect(count).toBeLessThanOrEqual(5);
    });

    it('should handle empty string', () => {
      const client = new ClaudeCodeCLIClient();
      expect(client.countTokens('')).toBe(0);
    });

    it('should handle long content', () => {
      const client = new ClaudeCodeCLIClient();
      const content = 'a'.repeat(4000); // 4000 chars
      const count = client.countTokens(content);

      // ~4 chars per token = ~1000 tokens
      expect(count).toBeGreaterThanOrEqual(900);
      expect(count).toBeLessThanOrEqual(1100);
    });
  });

  describe('response parsing', () => {
    it('should handle response field', async () => {
      const client = new ClaudeCodeCLIClient();
      mockSpawn.mockReturnValue(
        createMockChildProcess({
          stdout: '{"response": "Response field content"}',
          exitCode: 0,
        })
      );

      const response = await client.chat([{ role: 'user', content: 'Hi' }]);
      expect(response.content).toBe('Response field content');
    });

    it('should handle content field', async () => {
      const client = new ClaudeCodeCLIClient();
      mockSpawn.mockReturnValue(
        createMockChildProcess({
          stdout: '{"content": "Content field content"}',
          exitCode: 0,
        })
      );

      const response = await client.chat([{ role: 'user', content: 'Hi' }]);
      expect(response.content).toBe('Content field content');
    });

    it('should handle stop_reason field', async () => {
      const client = new ClaudeCodeCLIClient();
      mockSpawn.mockReturnValue(
        createMockChildProcess({
          stdout: '{"result": "OK", "stop_reason": "max_tokens"}',
          exitCode: 0,
        })
      );

      const response = await client.chat([{ role: 'user', content: 'Hi' }]);
      expect(response.finishReason).toBe('max_tokens');
    });

    it('should handle input_tokens and output_tokens snake_case', async () => {
      const client = new ClaudeCodeCLIClient();
      mockSpawn.mockReturnValue(
        createMockChildProcess({
          stdout: '{"result": "OK", "input_tokens": 100, "output_tokens": 50}',
          exitCode: 0,
        })
      );

      const response = await client.chat([{ role: 'user', content: 'Hi' }]);
      expect(response.usage.inputTokens).toBe(100);
      expect(response.usage.outputTokens).toBe(50);
      expect(response.usage.totalTokens).toBe(150);
    });
  });

  describe('Windows compatibility', () => {
    it('should use shell on Windows platform', async () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'win32' });

      const client = new ClaudeCodeCLIClient();
      mockSpawn.mockReturnValue(
        createMockChildProcess({
          stdout: '{"result": "OK"}',
          exitCode: 0,
        })
      );

      await client.chat([{ role: 'user', content: 'Hi' }]);

      expect(mockSpawn).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
        expect.objectContaining({ shell: true })
      );

      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });
  });

  describe('executeWithTools()', () => {
    it('should add --allowedTools flag with mapped tool names', async () => {
      const client = new ClaudeCodeCLIClient();
      mockSpawn.mockReturnValue(
        createMockChildProcess({
          stdout: '{"result": "done"}',
          exitCode: 0,
        })
      );

      await client.executeWithTools(
        [{ role: 'user', content: 'Create a file' }],
        [{ name: 'write_file', description: 'Write file', inputSchema: { type: 'object' } }]
      );

      expect(mockSpawn).toHaveBeenCalledWith(
        'claude',
        expect.arrayContaining(['--allowedTools', 'Write']),
        expect.any(Object)
      );
    });

    it('should handle multiple tools', async () => {
      const client = new ClaudeCodeCLIClient();
      mockSpawn.mockReturnValue(
        createMockChildProcess({
          stdout: '{"result": "done"}',
          exitCode: 0,
        })
      );

      await client.executeWithTools(
        [{ role: 'user', content: 'Read and write' }],
        [
          { name: 'read_file', description: 'Read', inputSchema: { type: 'object' } },
          { name: 'write_file', description: 'Write', inputSchema: { type: 'object' } },
        ]
      );

      expect(mockSpawn).toHaveBeenCalledWith(
        'claude',
        expect.arrayContaining(['--allowedTools', 'Read,Write']),
        expect.any(Object)
      );
    });

    it('should work with empty tools array', async () => {
      const client = new ClaudeCodeCLIClient();
      mockSpawn.mockReturnValue(
        createMockChildProcess({
          stdout: '{"result": "done"}',
          exitCode: 0,
        })
      );

      await client.executeWithTools([{ role: 'user', content: 'Hello' }], []);

      // Should not have --allowedTools flag
      const callArgs = mockSpawn.mock.calls[0][1] as string[];
      expect(callArgs).not.toContain('--allowedTools');
    });

    it('should parse response correctly', async () => {
      const client = new ClaudeCodeCLIClient();
      mockSpawn.mockReturnValue(
        createMockChildProcess({
          stdout: '{"result": "Tool execution complete", "inputTokens": 50, "outputTokens": 25}',
          exitCode: 0,
        })
      );

      const response = await client.executeWithTools(
        [{ role: 'user', content: 'Do something' }],
        [{ name: 'run_command', description: 'Run', inputSchema: { type: 'object' } }]
      );

      expect(response.content).toBe('Tool execution complete');
      expect(response.usage.inputTokens).toBe(50);
      expect(response.usage.outputTokens).toBe(25);
    });
  });

  describe('continueConversation()', () => {
    it('should use --resume flag with conversation ID and send message via stdin', async () => {
      const client = new ClaudeCodeCLIClient();
      const mockProcess = createMockChildProcess({
        stdout: '{"result": "continued"}',
        exitCode: 0,
      });
      mockSpawn.mockReturnValue(mockProcess);

      await client.continueConversation('conv-123', 'Next message');

      const callArgs = mockSpawn.mock.calls[0][1] as string[];
      expect(callArgs).toContain('--resume');
      expect(callArgs).toContain('conv-123');
      // Message should be sent via stdin, not as positional arg
      expect(mockProcess.stdin.write).toHaveBeenCalled();
      expect(mockProcess.stdin.data.join('')).toBe('Next message');
    });

    it('should include max tokens if specified', async () => {
      const client = new ClaudeCodeCLIClient();
      mockSpawn.mockReturnValue(
        createMockChildProcess({
          stdout: '{"result": "ok"}',
          exitCode: 0,
        })
      );

      await client.continueConversation('conv-123', 'More', { maxTokens: 1000 });

      expect(mockSpawn).toHaveBeenCalledWith(
        'claude',
        expect.arrayContaining(['--max-tokens', '1000']),
        expect.any(Object)
      );
    });

    it('should parse response correctly', async () => {
      const client = new ClaudeCodeCLIClient();
      mockSpawn.mockReturnValue(
        createMockChildProcess({
          stdout: '{"result": "Continued response", "inputTokens": 30, "outputTokens": 20}',
          exitCode: 0,
        })
      );

      const response = await client.continueConversation('conv-123', 'Continue');

      expect(response.content).toBe('Continued response');
      expect(response.usage.inputTokens).toBe(30);
      expect(response.usage.outputTokens).toBe(20);
    });

    it('should include --print and --output-format json flags', async () => {
      const client = new ClaudeCodeCLIClient();
      mockSpawn.mockReturnValue(
        createMockChildProcess({
          stdout: '{"result": "ok"}',
          exitCode: 0,
        })
      );

      await client.continueConversation('conv-456', 'Hello again');

      expect(mockSpawn).toHaveBeenCalledWith(
        'claude',
        expect.arrayContaining(['--print', '--output-format', 'json']),
        expect.any(Object)
      );
    });
  });

  describe('tool mapping', () => {
    it('should map list_files to LS', async () => {
      const client = new ClaudeCodeCLIClient();
      mockSpawn.mockReturnValue(
        createMockChildProcess({
          stdout: '{"result": "listed"}',
          exitCode: 0,
        })
      );

      await client.executeWithTools(
        [{ role: 'user', content: 'List files' }],
        [{ name: 'list_files', description: 'List', inputSchema: { type: 'object' } }]
      );

      expect(mockSpawn).toHaveBeenCalledWith(
        'claude',
        expect.arrayContaining(['--allowedTools', 'LS']),
        expect.any(Object)
      );
    });

    it('should map all Nexus tools correctly', async () => {
      const client = new ClaudeCodeCLIClient();
      mockSpawn.mockReturnValue(
        createMockChildProcess({
          stdout: '{"result": "done"}',
          exitCode: 0,
        })
      );

      const tools = [
        { name: 'read_file', description: 'Read', inputSchema: { type: 'object' as const } },
        { name: 'write_file', description: 'Write', inputSchema: { type: 'object' as const } },
        { name: 'edit_file', description: 'Edit', inputSchema: { type: 'object' as const } },
        { name: 'run_command', description: 'Run', inputSchema: { type: 'object' as const } },
        { name: 'search_code', description: 'Search', inputSchema: { type: 'object' as const } },
        { name: 'list_files', description: 'List', inputSchema: { type: 'object' as const } },
      ];

      await client.executeWithTools([{ role: 'user', content: 'Use tools' }], tools);

      expect(mockSpawn).toHaveBeenCalledWith(
        'claude',
        expect.arrayContaining(['--allowedTools', 'Read,Write,Edit,Bash,Grep,LS']),
        expect.any(Object)
      );
    });

    it('should return original name for unknown tools', async () => {
      const client = new ClaudeCodeCLIClient();
      mockSpawn.mockReturnValue(
        createMockChildProcess({
          stdout: '{"result": "done"}',
          exitCode: 0,
        })
      );

      await client.executeWithTools(
        [{ role: 'user', content: 'Use custom' }],
        [{ name: 'custom_tool', description: 'Custom', inputSchema: { type: 'object' } }]
      );

      expect(mockSpawn).toHaveBeenCalledWith(
        'claude',
        expect.arrayContaining(['--allowedTools', 'custom_tool']),
        expect.any(Object)
      );
    });
  });
});
