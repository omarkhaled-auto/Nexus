/**
 * MSW Handlers for LLM API Mocking
 *
 * Provides mock implementations for Claude (Anthropic) and Gemini (Google) APIs.
 * Supports both streaming and non-streaming responses.
 *
 * @module tests/mocks/handlers
 */
import { http, HttpResponse, delay } from 'msw';

// ============================================================================
// Response Builders
// ============================================================================

/**
 * Default Claude streaming response chunks (SSE format)
 */
export function createClaudeStreamChunks(text: string): string[] {
  const words = text.split(' ');
  const chunks: string[] = [];

  // Start message event
  chunks.push(
    'event: message_start\ndata: {"type":"message_start","message":{"id":"msg_test","type":"message","role":"assistant","content":[],"model":"claude-sonnet-4-5-20250514","stop_reason":null,"usage":{"input_tokens":100,"output_tokens":0}}}\n\n'
  );

  // Content block start
  chunks.push(
    'event: content_block_start\ndata: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}\n\n'
  );

  // Stream text in chunks
  for (const word of words) {
    const delta = `event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"${word} "}}\n\n`;
    chunks.push(delta);
  }

  // Content block stop
  chunks.push(
    'event: content_block_stop\ndata: {"type":"content_block_stop","index":0}\n\n'
  );

  // Message delta with stop reason
  chunks.push(
    'event: message_delta\ndata: {"type":"message_delta","delta":{"stop_reason":"end_turn"},"usage":{"output_tokens":50}}\n\n'
  );

  // Message stop
  chunks.push('event: message_stop\ndata: {"type":"message_stop"}\n\n');

  return chunks;
}

/**
 * Create Claude tool use streaming response
 */
export function createClaudeToolUseChunks(toolId: string, toolName: string, args: Record<string, unknown>): string[] {
  const chunks: string[] = [];

  // Start message
  chunks.push(
    'event: message_start\ndata: {"type":"message_start","message":{"id":"msg_test","type":"message","role":"assistant","content":[],"model":"claude-sonnet-4-5-20250514","stop_reason":null,"usage":{"input_tokens":100,"output_tokens":0}}}\n\n'
  );

  // Tool use content block start
  chunks.push(
    `event: content_block_start\ndata: {"type":"content_block_start","index":0,"content_block":{"type":"tool_use","id":"${toolId}","name":"${toolName}","input":{}}}\n\n`
  );

  // Stream the JSON arguments
  const jsonStr = JSON.stringify(args);
  chunks.push(
    `event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"input_json_delta","partial_json":"${jsonStr.replace(/"/g, '\\"')}"}}\n\n`
  );

  // Content block stop
  chunks.push(
    'event: content_block_stop\ndata: {"type":"content_block_stop","index":0}\n\n'
  );

  // Message delta with tool_use stop reason
  chunks.push(
    'event: message_delta\ndata: {"type":"message_delta","delta":{"stop_reason":"tool_use"},"usage":{"output_tokens":30}}\n\n'
  );

  // Message stop
  chunks.push('event: message_stop\ndata: {"type":"message_stop"}\n\n');

  return chunks;
}

/**
 * Create Gemini JSON response
 */
export function createGeminiResponse(text: string): object {
  return {
    candidates: [
      {
        content: {
          parts: [{ text }],
          role: 'model',
        },
        finishReason: 'STOP',
        safetyRatings: [],
      },
    ],
    usageMetadata: {
      promptTokenCount: 100,
      candidatesTokenCount: 50,
      totalTokenCount: 150,
    },
  };
}

// ============================================================================
// Mock Handler State
// ============================================================================

/**
 * State for controlling mock behavior in tests
 */
export const mockState = {
  claude: {
    nextResponse: 'Hello from Claude mock!',
    shouldStream: true,
    delayMs: 10,
    shouldError: false,
    errorStatus: 500,
    errorMessage: 'Mock error',
    toolUse: null as { id: string; name: string; args: Record<string, unknown> } | null,
  },
  gemini: {
    nextResponse: 'Hello from Gemini mock!',
    shouldError: false,
    errorStatus: 500,
    errorMessage: 'Mock error',
  },
};

/**
 * Reset mock state to defaults
 */
export function resetMockState(): void {
  mockState.claude = {
    nextResponse: 'Hello from Claude mock!',
    shouldStream: true,
    delayMs: 10,
    shouldError: false,
    errorStatus: 500,
    errorMessage: 'Mock error',
    toolUse: null,
  };
  mockState.gemini = {
    nextResponse: 'Hello from Gemini mock!',
    shouldError: false,
    errorStatus: 500,
    errorMessage: 'Mock error',
  };
}

// ============================================================================
// MSW Handlers
// ============================================================================

export const handlers = [
  // -------------------------------------------------------------------------
  // Claude API (Anthropic) - POST /v1/messages
  // -------------------------------------------------------------------------
  http.post('https://api.anthropic.com/v1/messages', async ({ request }) => {
    // Check for error simulation
    if (mockState.claude.shouldError) {
      return HttpResponse.json(
        { error: { message: mockState.claude.errorMessage } },
        { status: mockState.claude.errorStatus }
      );
    }

    // Parse request to check if streaming
    const body = await request.json() as { stream?: boolean };
    const isStreaming = body.stream === true || mockState.claude.shouldStream;

    if (isStreaming) {
      // Streaming response using ReadableStream
      let chunks: string[];

      if (mockState.claude.toolUse) {
        chunks = createClaudeToolUseChunks(
          mockState.claude.toolUse.id,
          mockState.claude.toolUse.name,
          mockState.claude.toolUse.args
        );
      } else {
        chunks = createClaudeStreamChunks(mockState.claude.nextResponse);
      }

      const stream = new ReadableStream({
        async start(controller) {
          for (const chunk of chunks) {
            controller.enqueue(new TextEncoder().encode(chunk));
            await delay(mockState.claude.delayMs);
          }
          controller.close();
        },
      });

      return new HttpResponse(stream, {
        headers: {
          'content-type': 'text/event-stream',
          'cache-control': 'no-cache',
        },
      });
    }

    // Non-streaming JSON response
    return HttpResponse.json({
      id: 'msg_test_' + Date.now(),
      type: 'message',
      role: 'assistant',
      content: [{ type: 'text', text: mockState.claude.nextResponse }],
      model: 'claude-sonnet-4-5-20250514',
      stop_reason: 'end_turn',
      usage: {
        input_tokens: 100,
        output_tokens: 50,
      },
    });
  }),

  // -------------------------------------------------------------------------
  // Gemini API (Google) - POST /v1beta/models/*/generateContent
  // -------------------------------------------------------------------------
  http.post('https://generativelanguage.googleapis.com/v1beta/models/:model/generateContent', async () => {
    // Check for error simulation
    if (mockState.gemini.shouldError) {
      return HttpResponse.json(
        { error: { message: mockState.gemini.errorMessage } },
        { status: mockState.gemini.errorStatus }
      );
    }

    return HttpResponse.json(createGeminiResponse(mockState.gemini.nextResponse));
  }),

  // Also handle the v1 API endpoint
  http.post('https://generativelanguage.googleapis.com/v1/models/:model/generateContent', async () => {
    if (mockState.gemini.shouldError) {
      return HttpResponse.json(
        { error: { message: mockState.gemini.errorMessage } },
        { status: mockState.gemini.errorStatus }
      );
    }

    return HttpResponse.json(createGeminiResponse(mockState.gemini.nextResponse));
  }),

  // Gemini streaming endpoint
  http.post('https://generativelanguage.googleapis.com/v1beta/models/:model/streamGenerateContent', async () => {
    if (mockState.gemini.shouldError) {
      return HttpResponse.json(
        { error: { message: mockState.gemini.errorMessage } },
        { status: mockState.gemini.errorStatus }
      );
    }

    // For simplicity, return single-chunk "streaming" response
    // Real Gemini streaming uses a different format
    return HttpResponse.json([createGeminiResponse(mockState.gemini.nextResponse)]);
  }),

  http.post('https://generativelanguage.googleapis.com/v1/models/:model/streamGenerateContent', async () => {
    if (mockState.gemini.shouldError) {
      return HttpResponse.json(
        { error: { message: mockState.gemini.errorMessage } },
        { status: mockState.gemini.errorStatus }
      );
    }

    return HttpResponse.json([createGeminiResponse(mockState.gemini.nextResponse)]);
  }),
];

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Set the next Claude response for tests
 */
export function setClaudeResponse(response: string): void {
  mockState.claude.nextResponse = response;
}

/**
 * Set Claude to return a tool use response
 */
export function setClaudeToolUse(id: string, name: string, args: Record<string, unknown>): void {
  mockState.claude.toolUse = { id, name, args };
}

/**
 * Set Claude to return an error
 */
export function setClaudeError(status: number, message: string): void {
  mockState.claude.shouldError = true;
  mockState.claude.errorStatus = status;
  mockState.claude.errorMessage = message;
}

/**
 * Set the next Gemini response for tests
 */
export function setGeminiResponse(response: string): void {
  mockState.gemini.nextResponse = response;
}

/**
 * Set Gemini to return an error
 */
export function setGeminiError(status: number, message: string): void {
  mockState.gemini.shouldError = true;
  mockState.gemini.errorStatus = status;
  mockState.gemini.errorMessage = message;
}
