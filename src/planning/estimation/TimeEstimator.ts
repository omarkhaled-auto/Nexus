// TimeEstimator - AI-Based Estimation
// Phase 04-01: Planning Layer Implementation
// Stub implementation for RED phase - tests should fail

import type { Feature } from '../../types/core';
import type { LLMClient } from '../../llm/types';
import type {
  PlanningTask,
  FeatureEstimate,
  CompletedTask,
  ITimeEstimator,
} from '../types';

export interface TimeEstimatorOptions {
  llmClient: LLMClient;
}

/**
 * TimeEstimator uses LLM and historical data to estimate task duration.
 * Stub implementation - all methods throw or return empty.
 */
export class TimeEstimator implements ITimeEstimator {
  constructor(_options: TimeEstimatorOptions) {
    // Stub - not implemented
  }

  async estimateTime(_task: PlanningTask): Promise<number> {
    throw new Error('Not implemented');
  }

  async estimateFeature(_feature: Feature): Promise<FeatureEstimate> {
    throw new Error('Not implemented');
  }

  calibrate(_history: CompletedTask[]): void {
    throw new Error('Not implemented');
  }

  getCalibrationFactor(): number {
    throw new Error('Not implemented');
  }
}
