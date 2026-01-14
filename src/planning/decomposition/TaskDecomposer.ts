// TaskDecomposer - Feature to Task Breakdown
// Phase 04-01: Planning Layer Implementation
// Stub implementation for RED phase - tests should fail

import type { Feature, SubFeature } from '../../types/core';
import type { LLMClient } from '../../llm/types';
import type {
  PlanningTask,
  ValidationResult,
  ITaskDecomposer,
} from '../types';

export interface TaskDecomposerOptions {
  llmClient: LLMClient;
}

/**
 * TaskDecomposer uses LLM to intelligently break features into atomic tasks.
 * Stub implementation - all methods throw or return empty.
 */
export class TaskDecomposer implements ITaskDecomposer {
  constructor(_options: TaskDecomposerOptions) {
    // Stub - not implemented
  }

  async decompose(_feature: Feature): Promise<PlanningTask[]> {
    throw new Error('Not implemented');
  }

  async decomposeSubFeature(_subFeature: SubFeature): Promise<PlanningTask[]> {
    throw new Error('Not implemented');
  }

  validateTaskSize(_task: PlanningTask): ValidationResult {
    throw new Error('Not implemented');
  }

  async splitTask(_task: PlanningTask): Promise<PlanningTask[]> {
    throw new Error('Not implemented');
  }

  estimateTime(_task: PlanningTask): number {
    throw new Error('Not implemented');
  }
}
