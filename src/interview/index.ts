/**
 * Interview Engine Module
 *
 * Phase 9: Requirements extraction through AI-powered conversational interviews.
 *
 * Components:
 * - RequirementExtractor: Parses structured requirements from LLM responses
 * - QuestionGenerator: Generates contextual follow-up questions and detects gaps
 * - InterviewEngine: Main orchestrator for interview sessions
 * - Prompts: System prompts for interviewing and extraction
 */

// Types
export * from './types';

// Core classes
export { RequirementExtractor } from './RequirementExtractor';
export type { RequirementExtractorOptions } from './types';

export { QuestionGenerator } from './QuestionGenerator';
export type {
  QuestionGeneratorOptions,
  InterviewMessage,
  GeneratedQuestion,
  GenerationContext,
  GenerationResult,
} from './QuestionGenerator';

export { InterviewEngine } from './InterviewEngine';
export type {
  InterviewEngineOptions,
  InterviewSession,
  InterviewSessionStatus,
  ProcessMessageResult,
} from './InterviewEngine';

// Prompts
export {
  INTERVIEWER_SYSTEM_PROMPT,
  STANDARD_AREAS,
  INITIAL_GREETING,
  getInterviewerSystemPrompt,
  getGapSuggestionPrompt,
} from './prompts/interviewer';
export type { StandardArea } from './prompts/interviewer';

export {
  EXTRACTION_SYSTEM_PROMPT,
  SINGLE_MESSAGE_EXTRACTION_PROMPT,
  DEDUPLICATION_PROMPT,
  buildExtractionPrompt,
} from './prompts/extractor';
