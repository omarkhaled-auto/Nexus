// PlanningExecutionBridge - Stub for TDD RED phase
// Phase 04-03: Plan to execution connection

import type { TaskQueue } from '@/orchestration/types';
import type { Wave } from '@/planning/types';
import type { EventBus } from '@/orchestration/events/EventBus';

/**
 * Handle returned when submitting a plan
 */
export interface ExecutionHandle {
  id: string;
}

/**
 * Status of an execution
 */
export interface ExecutionStatus {
  currentWave: number;
  totalWaves: number;
  completedTasks: number;
  failedTasks: number;
  pendingTasks: number;
  totalTasks: number;
  status: 'running' | 'completed' | 'aborted';
}

/**
 * Options for PlanningExecutionBridge constructor
 */
export interface PlanningExecutionBridgeOptions {
  taskQueue: TaskQueue;
  eventBus: EventBus;
}

/**
 * Unsubscribe function type
 */
export type Unsubscribe = () => void;

/**
 * PlanningExecutionBridge connects planning layer output to execution layer input.
 */
export class PlanningExecutionBridge {
  constructor(_options: PlanningExecutionBridgeOptions) {
    throw new Error('Not implemented');
  }

  /**
   * Submit a plan for execution
   */
  submitPlan(_waves: Wave[]): ExecutionHandle {
    throw new Error('Not implemented');
  }

  /**
   * Get execution status by handle ID
   */
  getExecutionStatus(_handleId: string): ExecutionStatus | null {
    throw new Error('Not implemented');
  }

  /**
   * Register callback for wave completion
   */
  onWaveComplete(_handleId: string, _callback: (waveId: number) => void): Unsubscribe {
    throw new Error('Not implemented');
  }

  /**
   * Register callback for plan completion
   */
  onPlanComplete(_handleId: string, _callback: () => void): Unsubscribe {
    throw new Error('Not implemented');
  }

  /**
   * Abort execution of a plan
   */
  abort(_handleId: string): void {
    throw new Error('Not implemented');
  }

  /**
   * Check if execution is complete
   */
  isComplete(_handleId: string): boolean {
    throw new Error('Not implemented');
  }
}
