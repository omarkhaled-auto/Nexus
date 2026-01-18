/**
 * QuestionGenerator Tests
 *
 * Tests for contextual question generation and gap detection.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QuestionGenerator } from './QuestionGenerator';
import type { GenerationContext, InterviewMessage } from './QuestionGenerator';
import type { ExtractedRequirement } from './types';
import type { LLMClient, Message, ChatOptions, LLMResponse, StreamChunk } from '../llm';
import { STANDARD_AREAS, INTERVIEWER_SYSTEM_PROMPT } from './prompts/interviewer';

/**
 * Create a mock LLM client for testing
 */
function createMockLLMClient(response: string): LLMClient {
  return {
    chat: vi.fn().mockResolvedValue({
      content: response,
      usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
      finishReason: 'stop',
    } as LLMResponse),
    chatStream: vi.fn(),
    countTokens: vi.fn().mockReturnValue(100),
  };
}

/**
 * Create sample interview messages
 */
function createMessages(count: number): InterviewMessage[] {
  const messages: InterviewMessage[] = [];
  for (let i = 0; i < count; i++) {
    messages.push({
      id: `msg-${i}`,
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `Message ${i} content`,
      timestamp: new Date(),
    });
  }
  return messages;
}

/**
 * Create sample extracted requirements
 */
function createRequirements(count: number): ExtractedRequirement[] {
  const requirements: ExtractedRequirement[] = [];
  for (let i = 0; i < count; i++) {
    requirements.push({
      id: `req-${i}`,
      text: `Requirement ${i}`,
      category: 'functional',
      priority: 'should',
      confidence: 0.9,
      area: 'authentication',
      sourceMessageId: `msg-${i}`,
    });
  }
  return requirements;
}

describe('QuestionGenerator', () => {
  let generator: QuestionGenerator;
  let mockClient: LLMClient;

  beforeEach(() => {
    mockClient = createMockLLMClient('What authentication method would you prefer?');
    generator = new QuestionGenerator({ llmClient: mockClient });
  });

  describe('generate()', () => {
    it('should return question with area and depth', async () => {
      const context: GenerationContext = {
        conversationHistory: createMessages(2),
        extractedRequirements: createRequirements(1),
        exploredAreas: ['authentication'],
      };

      const result = await generator.generate(context);

      expect(result.question).toBeDefined();
      expect(result.question.question).toBe('What authentication method would you prefer?');
      expect(result.question.area).toBeDefined();
      expect(result.question.depth).toBeDefined();
      expect(['broad', 'detailed', 'clarifying']).toContain(result.question.depth);
    });

    it('should call LLM with correct messages', async () => {
      const context: GenerationContext = {
        conversationHistory: [
          { id: 'msg-1', role: 'user', content: 'I want to build an app', timestamp: new Date() },
        ],
        extractedRequirements: [],
        exploredAreas: [],
      };

      await generator.generate(context);

      expect(mockClient.chat).toHaveBeenCalledTimes(1);
      const callArgs = (mockClient.chat as ReturnType<typeof vi.fn>).mock.calls[0];
      const messages = callArgs[0] as Message[];

      // Should have system message + conversation history
      expect(messages.length).toBe(2);
      expect(messages[0].role).toBe('system');
      expect(messages[1].role).toBe('user');
      expect(messages[1].content).toBe('I want to build an app');
    });

    it('should return broad depth for empty conversation', async () => {
      const context: GenerationContext = {
        conversationHistory: [],
        extractedRequirements: [],
        exploredAreas: [],
      };

      const result = await generator.generate(context);

      expect(result.question.depth).toBe('broad');
    });

    it('should return detailed depth when many requirements exist', async () => {
      const context: GenerationContext = {
        conversationHistory: createMessages(4),
        extractedRequirements: createRequirements(6),
        exploredAreas: ['authentication', 'data_model', 'api'],
      };

      const result = await generator.generate(context);

      expect(result.question.depth).toBe('detailed');
    });

    it('should include followsUp ID when there are previous messages', async () => {
      const context: GenerationContext = {
        conversationHistory: [
          { id: 'user-msg-1', role: 'user', content: 'I need authentication', timestamp: new Date() },
          { id: 'ai-msg-1', role: 'assistant', content: 'Got it!', timestamp: new Date() },
        ],
        extractedRequirements: [],
        exploredAreas: [],
      };

      const result = await generator.generate(context);

      expect(result.question.followsUp).toBe('user-msg-1');
    });
  });

  describe('detectGaps()', () => {
    it('should return unexplored areas', () => {
      const explored = ['authentication', 'data_model'];

      const gaps = generator.detectGaps(explored);

      expect(gaps).not.toContain('authentication');
      expect(gaps).not.toContain('data_model');
      expect(gaps).toContain('authorization');
      expect(gaps).toContain('api');
      expect(gaps).toContain('ui_ux');
      expect(gaps).toContain('performance');
      expect(gaps).toContain('security');
      expect(gaps).toContain('integrations');
      expect(gaps).toContain('deployment');
    });

    it('should return empty array when all areas explored', () => {
      const explored = [...STANDARD_AREAS];

      const gaps = generator.detectGaps(explored);

      expect(gaps).toHaveLength(0);
    });

    it('should handle case-insensitive matching', () => {
      const explored = ['AUTHENTICATION', 'Data_Model'];

      const gaps = generator.detectGaps(explored);

      expect(gaps).not.toContain('authentication');
      expect(gaps).not.toContain('data_model');
    });

    it('should return all standard areas when none explored', () => {
      const gaps = generator.detectGaps([]);

      expect(gaps).toHaveLength(STANDARD_AREAS.length);
      for (const area of STANDARD_AREAS) {
        expect(gaps).toContain(area);
      }
    });
  });

  describe('shouldSuggestGap()', () => {
    it('should return true when conditions are met', () => {
      const context: GenerationContext = {
        conversationHistory: createMessages(4),
        extractedRequirements: createRequirements(4), // 4 >= MIN_REQUIREMENTS_FOR_GAPS (3)
        exploredAreas: ['authentication', 'data_model'], // 2 >= MIN_EXPLORED_AREAS_FOR_GAPS (2)
      };

      const result = generator.shouldSuggestGap(context);

      expect(result).toBe(true);
    });

    it('should return false when too few requirements', () => {
      const context: GenerationContext = {
        conversationHistory: createMessages(4),
        extractedRequirements: createRequirements(2), // < 3
        exploredAreas: ['authentication', 'data_model'],
      };

      const result = generator.shouldSuggestGap(context);

      expect(result).toBe(false);
    });

    it('should return false when too few explored areas', () => {
      const context: GenerationContext = {
        conversationHistory: createMessages(4),
        extractedRequirements: createRequirements(5),
        exploredAreas: ['authentication'], // < 2
      };

      const result = generator.shouldSuggestGap(context);

      expect(result).toBe(false);
    });

    it('should return false when all areas explored (no gaps)', () => {
      const context: GenerationContext = {
        conversationHistory: createMessages(10),
        extractedRequirements: createRequirements(20),
        exploredAreas: [...STANDARD_AREAS], // All explored
      };

      const result = generator.shouldSuggestGap(context);

      expect(result).toBe(false);
    });
  });

  describe('getSystemPrompt()', () => {
    it('should return non-empty prompt', () => {
      const prompt = generator.getSystemPrompt();

      expect(prompt).toBeDefined();
      expect(prompt.length).toBeGreaterThan(0);
      expect(prompt).toBe(INTERVIEWER_SYSTEM_PROMPT);
    });

    it('should contain requirement extraction format', () => {
      const prompt = generator.getSystemPrompt();

      expect(prompt).toContain('<requirement>');
      expect(prompt).toContain('<text>');
      expect(prompt).toContain('<category>');
      expect(prompt).toContain('<priority>');
      expect(prompt).toContain('<confidence>');
    });

    it('should contain category definitions', () => {
      const prompt = generator.getSystemPrompt();

      expect(prompt).toContain('functional');
      expect(prompt).toContain('non_functional');
      expect(prompt).toContain('technical');
      expect(prompt).toContain('constraint');
      expect(prompt).toContain('assumption');
    });
  });

  describe('area inference', () => {
    it('should infer authentication area from response content', async () => {
      const mockClientAuth = createMockLLMClient(
        'How would you like users to log in? Do you need password authentication?'
      );
      const gen = new QuestionGenerator({ llmClient: mockClientAuth });

      const context: GenerationContext = {
        conversationHistory: [],
        extractedRequirements: [],
        exploredAreas: [],
      };

      const result = await gen.generate(context);

      expect(result.question.area).toBe('authentication');
    });

    it('should infer security area from response content', async () => {
      const mockClientSec = createMockLLMClient(
        'What encryption standards do you need? How should data be protected?'
      );
      const gen = new QuestionGenerator({ llmClient: mockClientSec });

      const context: GenerationContext = {
        conversationHistory: [],
        extractedRequirements: [],
        exploredAreas: [],
      };

      const result = await gen.generate(context);

      expect(result.question.area).toBe('security');
    });
  });
});
