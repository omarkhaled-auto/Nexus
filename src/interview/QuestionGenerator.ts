/**
 * QuestionGenerator - Contextual question generation and gap detection
 *
 * Generates follow-up questions based on conversation context and extracted requirements.
 * Detects unexplored areas to guide the interview toward completeness.
 *
 * Reference: Phase 9 RESEARCH.md - Chain-of-Thought for Interview Flow
 */

import type { LLMClient, Message, ChatOptions } from '../llm';
import type { ExtractedRequirement } from './types';
import { INTERVIEWER_SYSTEM_PROMPT, STANDARD_AREAS, type, getGapSuggestionPrompt } from './prompts/interviewer';

/**
 * Logger interface for optional logging
 */
export interface Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

/**
 * Options for QuestionGenerator
 */
export interface QuestionGeneratorOptions {
  llmClient: LLMClient;
  logger?: Logger;
}

/**
 * A message in the interview conversation
 */
export interface InterviewMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

/**
 * Generated question with metadata
 */
export interface GeneratedQuestion {
  /** The question text */
  question: string;
  /** Domain area this question explores */
  area: string;
  /** Depth level of the question */
  depth: 'broad' | 'detailed' | 'clarifying';
  /** ID of the message this follows up on (if any) */
  followsUp?: string;
}

/**
 * Context for question generation
 */
export interface GenerationContext {
  /** Full conversation history */
  conversationHistory: InterviewMessage[];
  /** Requirements extracted so far */
  extractedRequirements: ExtractedRequirement[];
  /** Areas that have been explored */
  exploredAreas: string[];
  /** Optional project description for context */
  projectDescription?: string;
}

/**
 * Result from question generation
 */
export interface GenerationResult {
  /** The generated question */
  question: GeneratedQuestion;
  /** Gaps detected in coverage */
  suggestedGaps: string[];
  /** Whether gaps should be surfaced to user */
  shouldSuggestGaps: boolean;
}

/**
 * Minimum requirements before suggesting gaps
 */
const MIN_REQUIREMENTS_FOR_GAPS = 3;

/**
 * Minimum explored areas before suggesting gaps
 */
const MIN_EXPLORED_AREAS_FOR_GAPS = 2;

/**
 * QuestionGenerator - Generates contextual follow-up questions
 *
 * Uses the LLM to generate relevant follow-up questions based on
 * conversation history and extracted requirements. Also detects
 * unexplored areas to guide comprehensive requirements gathering.
 */
export class QuestionGenerator {
  private readonly llmClient: LLMClient;
  private readonly logger?: Logger;

  constructor(options: QuestionGeneratorOptions) {
    this.llmClient = options.llmClient;
    this.logger = options.logger;
  }

  /**
   * Generate a follow-up question based on context
   *
   * @param context The current conversation context
   * @returns Generated question with metadata
   */
  async generate(context: GenerationContext): Promise<GenerationResult> {
    this.logger?.debug('Generating question', {
      messageCount: context.conversationHistory.length,
      requirementCount: context.extractedRequirements.length,
      exploredAreas: context.exploredAreas,
    });

    // Detect gaps
    const gaps = this.detectGaps(context.exploredAreas);
    const shouldSuggestGaps = this.shouldSuggestGap(context);

    // Build the prompt for question generation
    const systemPrompt = this.buildQuestionPrompt(context, shouldSuggestGaps ? gaps : []);

    // Build messages array
    const messages: Message[] = [
      { role: 'system', content: systemPrompt },
      ...context.conversationHistory.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
    ];

    // Call LLM
    const options: ChatOptions = {
      maxTokens: 1024,
      temperature: 0.7,
    };

    const response = await this.llmClient.chat(messages, options);

    // Parse the response to extract question metadata
    const question = this.parseQuestionResponse(response.content, context);

    this.logger?.info('Generated question', {
      area: question.area,
      depth: question.depth,
      gapsFound: gaps.length,
    });

    return {
      question,
      suggestedGaps: gaps,
      shouldSuggestGaps,
    };
  }

  /**
   * Detect unexplored standard areas
   *
   * @param exploredAreas Areas that have been discussed
   * @returns Array of standard areas not yet explored
   */
  detectGaps(exploredAreas: string[]): string[] {
    const explored = new Set(exploredAreas.map((a) => a.toLowerCase()));

    return STANDARD_AREAS.filter((area) => !explored.has(area));
  }

  /**
   * Determine if gaps should be suggested to the user
   *
   * Gaps are only suggested after enough context has been gathered
   * (minimum requirements and explored areas)
   *
   * @param context The generation context
   * @returns True if gaps should be surfaced
   */
  shouldSuggestGap(context: GenerationContext): boolean {
    const hasEnoughRequirements =
      context.extractedRequirements.length >= MIN_REQUIREMENTS_FOR_GAPS;
    const hasEnoughExploration = context.exploredAreas.length >= MIN_EXPLORED_AREAS_FOR_GAPS;
    const hasGaps = this.detectGaps(context.exploredAreas).length > 0;

    return hasEnoughRequirements && hasEnoughExploration && hasGaps;
  }

  /**
   * Get the interviewer system prompt
   *
   * @returns The full system prompt for the interviewer
   */
  getSystemPrompt(): string {
    return INTERVIEWER_SYSTEM_PROMPT;
  }

  /**
   * Build the question generation prompt
   */
  private buildQuestionPrompt(context: GenerationContext, gaps: string[]): string {
    let prompt = INTERVIEWER_SYSTEM_PROMPT;

    // Add project context if available
    if (context.projectDescription) {
      prompt += `\n\nProject Context:\n${context.projectDescription}`;
    }

    // Add extracted requirements summary
    if (context.extractedRequirements.length > 0) {
      const reqSummary = context.extractedRequirements
        .slice(-10) // Last 10 requirements
        .map((r) => `- [${r.category}] ${r.text}`)
        .join('\n');

      prompt += `\n\nRequirements captured so far:\n${reqSummary}`;
    }

    // Add explored areas
    if (context.exploredAreas.length > 0) {
      prompt += `\n\nAreas already discussed: ${context.exploredAreas.join(', ')}`;
    }

    // Add gap suggestion if appropriate
    if (gaps.length > 0) {
      prompt += getGapSuggestionPrompt(gaps);
    }

    return prompt;
  }

  /**
   * Parse LLM response to extract question metadata
   */
  private parseQuestionResponse(
    response: string,
    context: GenerationContext
  ): GeneratedQuestion {
    // Determine depth based on context
    let depth: 'broad' | 'detailed' | 'clarifying' = 'broad';

    if (context.conversationHistory.length === 0) {
      depth = 'broad';
    } else if (context.extractedRequirements.length > 5) {
      depth = 'detailed';
    } else if (context.conversationHistory.length > 2) {
      depth = 'clarifying';
    }

    // Determine area from response or context
    const area = this.inferAreaFromResponse(response, context);

    // Get the last user message ID if this is a follow-up
    const lastUserMessage = context.conversationHistory
      .filter((m) => m.role === 'user')
      .pop();

    return {
      question: response,
      area,
      depth,
      followsUp: lastUserMessage?.id,
    };
  }

  /**
   * Infer the domain area from response content
   */
  private inferAreaFromResponse(response: string, context: GenerationContext): string {
    const responseLower = response.toLowerCase();

    // Check for standard areas mentioned in the response
    for (const area of STANDARD_AREAS) {
      if (responseLower.includes(area.replace('_', ' '))) {
        return area;
      }
    }

    // Check for common keywords
    // Order matters - more specific keywords should be checked first
    // Security keywords like "encrypt", "protect" should be matched before
    // generic words like "data" that appear in other areas
    const areaKeywords: Array<[string, string[]]> = [
      // Check security first - has specific keywords that shouldn't be confused with data_model
      ['security', ['encrypt', 'secure', 'vulnerability', 'protect', 'safety', 'threat']],
      // Authentication - specific keywords
      ['authentication', ['login', 'sign in', 'password', 'auth', 'sso', 'oauth', 'credential']],
      // Authorization - distinct from authentication
      ['authorization', ['permission', 'role', 'access control', 'admin', 'privilege']],
      // Performance - specific metrics
      ['performance', ['speed', 'latency', 'response time', 'load', 'throughput', 'benchmark']],
      // Integrations - external connections
      ['integrations', ['integrate', 'third-party', 'external', 'connect', 'plugin']],
      // Deployment - infrastructure
      ['deployment', ['deploy', 'hosting', 'cloud', 'infrastructure', 'server', 'container']],
      // UI/UX - user interface
      ['ui_ux', ['interface', 'design', 'user experience', 'layout', 'screen', 'component']],
      // API - endpoints
      ['api', ['endpoint', 'rest', 'graphql', 'webhook', 'route']],
      // Data model - last since 'data' is generic
      ['data_model', ['database', 'schema', 'entity', 'model', 'table', 'migration']],
    ];

    for (const [area, keywords] of areaKeywords) {
      for (const keyword of keywords) {
        if (responseLower.includes(keyword)) {
          return area;
        }
      }
    }

    // Default to last explored area or general
    return context.exploredAreas[context.exploredAreas.length - 1] || 'general';
  }
}
