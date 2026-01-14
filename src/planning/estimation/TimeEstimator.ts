// TimeEstimator - AI-Based Estimation
// Phase 04-01: Planning Layer Implementation

import type { Feature } from '../../types/core';
import type { LLMClient, Message } from '../../llm/types';
import type {
  PlanningTask,
  FeatureEstimate,
  TaskEstimate,
  CompletedTask,
  ITimeEstimator,
  DecompositionResult,
} from '../types';
import {
  MAX_TASK_MINUTES,
  MIN_TASK_MINUTES,
  DEFAULT_CALIBRATION_FACTOR,
  EstimationError,
} from '../types';

export interface TimeEstimatorOptions {
  llmClient: LLMClient;
}

/**
 * TimeEstimator uses LLM and historical data to estimate task duration.
 *
 * Key responsibilities:
 * - Estimate task duration using LLM analysis
 * - Estimate feature duration by decomposing and summing tasks
 * - Calibrate estimates based on historical accuracy
 */
export class TimeEstimator implements ITimeEstimator {
  private llmClient: LLMClient;
  private calibrationFactor: number = DEFAULT_CALIBRATION_FACTOR;

  constructor(options: TimeEstimatorOptions) {
    this.llmClient = options.llmClient;
  }

  /**
   * Estimate time for a single task using LLM
   */
  async estimateTime(task: PlanningTask): Promise<number> {
    try {
      const prompt = this.buildEstimationPrompt(task);
      const messages: Message[] = [
        { role: 'system', content: this.getSystemPrompt() },
        { role: 'user', content: prompt },
      ];

      const response = await this.llmClient.chat(messages, { maxTokens: 500 });
      const estimate = this.parseEstimationResponse(response.content);

      // Apply calibration factor
      const calibratedEstimate = Math.round(estimate * this.calibrationFactor);

      // Bound to valid range
      return this.boundEstimate(calibratedEstimate);
    } catch (error) {
      throw new EstimationError(
        'Failed to estimate task time: ' + (error instanceof Error ? error.message : 'Unknown error'),
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Estimate total time for a feature by decomposing and summing task estimates
   */
  async estimateFeature(feature: Feature): Promise<FeatureEstimate> {
    try {
      // First, decompose the feature into tasks
      const tasks = await this.decomposeFeature(feature);

      // Estimate each task
      const breakdown: TaskEstimate[] = [];
      let totalMinutes = 0;
      let confidenceSum = 0;

      for (const task of tasks) {
        const estimate = await this.estimateTime(task);
        const confidence = this.calculateConfidence(task);

        breakdown.push({
          taskId: task.id,
          estimatedMinutes: estimate,
          confidence,
        });

        totalMinutes += estimate;
        confidenceSum += confidence;
      }

      // Calculate average confidence
      const averageConfidence = tasks.length > 0 ? confidenceSum / tasks.length : 0;

      return {
        featureId: feature.id,
        totalMinutes,
        taskCount: tasks.length,
        confidence: averageConfidence,
        breakdown,
      };
    } catch (error) {
      throw new EstimationError(
        'Failed to estimate feature: ' + (error instanceof Error ? error.message : 'Unknown error'),
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Calibrate estimates based on historical completion data
   */
  calibrate(history: CompletedTask[]): void {
    if (history.length === 0) {
      // Keep default calibration factor
      return;
    }

    // Calculate the average ratio of actual to estimated time
    let totalRatio = 0;

    for (const completed of history) {
      if (completed.estimatedMinutes > 0) {
        const ratio = completed.actualMinutes / completed.estimatedMinutes;
        totalRatio += ratio;
      }
    }

    const averageRatio = totalRatio / history.length;

    // Update calibration factor
    // If average ratio > 1, we underestimated (tasks took longer)
    // If average ratio < 1, we overestimated (tasks completed faster)
    this.calibrationFactor = averageRatio;
  }

  /**
   * Get the current calibration factor
   */
  getCalibrationFactor(): number {
    return this.calibrationFactor;
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private getSystemPrompt(): string {
    return `You are a task estimation expert. Analyze the task description and estimate how long it will take to complete.

Consider these factors:
1. Task complexity (simple CRUD: ~15min, complex algorithm: ~30min)
2. Number of files involved
3. Testing requirements (TDD tasks take longer)
4. Dependencies on external systems

Return JSON with:
{
  "estimatedMinutes": <number between 5 and 30>,
  "confidence": <number between 0 and 1>,
  "reasoning": "<brief explanation>"
}`;
  }

  private buildEstimationPrompt(task: PlanningTask): string {
    return `Estimate the time needed for this task:

Name: ${task.name}
Description: ${task.description}
Type: ${task.type}
Size: ${task.size}
Files: ${JSON.stringify(task.files || [])}
Test Criteria: ${JSON.stringify(task.testCriteria || [])}

Provide your estimate in minutes (5-30 range).`;
  }

  private parseEstimationResponse(content: string): number {
    try {
      // Try to parse JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (typeof parsed.estimatedMinutes === 'number') {
          return parsed.estimatedMinutes;
        }
      }

      // Fallback: try to find a number in the response
      const numberMatch = content.match(/(\d+)\s*min/i);
      if (numberMatch) {
        return parseInt(numberMatch[1], 10);
      }

      // Default estimate
      return 15;
    } catch {
      return 15;
    }
  }

  private boundEstimate(estimate: number): number {
    if (estimate > MAX_TASK_MINUTES) {
      return MAX_TASK_MINUTES;
    }
    if (estimate < MIN_TASK_MINUTES) {
      return MIN_TASK_MINUTES;
    }
    return estimate;
  }

  private calculateConfidence(task: PlanningTask): number {
    // Base confidence
    let confidence = 0.8;

    // Adjust based on task characteristics
    if (task.type === 'tdd') {
      confidence -= 0.1; // TDD tasks have more uncertainty
    }

    if (task.size === 'small') {
      confidence -= 0.05; // Larger tasks are harder to estimate
    }

    if (!task.testCriteria || task.testCriteria.length === 0) {
      confidence -= 0.1; // Unclear scope reduces confidence
    }

    // Ensure confidence stays in valid range
    return Math.max(0.3, Math.min(1.0, confidence));
  }

  private async decomposeFeature(feature: Feature): Promise<PlanningTask[]> {
    const prompt = `Decompose this feature into atomic tasks (5-30 minutes each):

Feature: ${feature.name}
Description: ${feature.description}

Return JSON with tasks array where each task has:
- id, name, description, type, size, estimatedMinutes, dependsOn, testCriteria, files`;

    const messages: Message[] = [
      { role: 'system', content: 'You are a task decomposition expert.' },
      { role: 'user', content: prompt },
    ];

    const response = await this.llmClient.chat(messages, { maxTokens: 2000 });

    return this.parseDecompositionResponse(response.content);
  }

  private parseDecompositionResponse(content: string): PlanningTask[] {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return [];
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return (parsed.tasks || []).map((t: Record<string, unknown>) => ({
        id: String(t.id || `task-${Date.now()}`),
        name: String(t.name || 'Task'),
        description: String(t.description || ''),
        type: this.normalizeTaskType(t.type),
        size: this.normalizeTaskSize(t.size),
        estimatedMinutes: Number(t.estimatedMinutes) || 15,
        dependsOn: Array.isArray(t.dependsOn) ? t.dependsOn.map(String) : [],
        testCriteria: Array.isArray(t.testCriteria) ? t.testCriteria.map(String) : [],
        files: Array.isArray(t.files) ? t.files.map(String) : [],
      }));
    } catch {
      return [];
    }
  }

  private normalizeTaskType(type: unknown): 'auto' | 'tdd' | 'checkpoint' {
    if (type === 'auto' || type === 'tdd' || type === 'checkpoint') {
      return type;
    }
    return 'auto';
  }

  private normalizeTaskSize(size: unknown): 'atomic' | 'small' {
    if (size === 'atomic' || size === 'small') {
      return size;
    }
    return 'atomic';
  }
}
