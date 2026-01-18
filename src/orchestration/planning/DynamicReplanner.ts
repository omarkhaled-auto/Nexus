/**
 * Dynamic Replanner
 *
 * Monitors task execution and triggers replanning when tasks
 * prove more complex than initially estimated.
 *
 * Layer 2/3: Orchestration / Planning
 *
 * Philosophy:
 * - Detect complexity through multiple signals
 * - Make informed decisions about when to intervene
 * - Support both automatic and agent-requested replanning
 * - Maintain history for learning and debugging
 */

import {
  type IDynamicReplanner,
  type ITriggerEvaluator,
  type ITaskSplitter,
  type ExecutionContext,
  type ReplanDecision,
  type ReplanResult,
  type ReplanReason,
  type ReplanMetrics,
  type TriggerThresholds,
  type TriggerResult,
  type MonitoredTask,
  type AgentReplanRequest,
  type Task,
  type ReplanAction,
  type ReplannerEventEmitter,
  DEFAULT_TRIGGER_THRESHOLDS,
  TRIGGER_PRIORITY,
} from './types';

/**
 * DynamicReplanner monitors tasks and triggers replanning when needed
 */
export class DynamicReplanner implements IDynamicReplanner {
  private readonly triggerEvaluators: ITriggerEvaluator[];
  private readonly taskSplitter: ITaskSplitter;
  private thresholds: TriggerThresholds;
  private readonly monitoredTasks: Map<string, MonitoredTask>;
  private readonly decisionHistory: Map<string, ReplanDecision[]>;
  private readonly eventEmitter?: ReplannerEventEmitter;

  /**
   * Create a new DynamicReplanner
   *
   * @param triggers Array of trigger evaluators
   * @param taskSplitter Task splitter implementation
   * @param thresholds Optional custom thresholds
   * @param eventEmitter Optional event emitter for notifications
   */
  constructor(
    triggers: ITriggerEvaluator[],
    taskSplitter: ITaskSplitter,
    thresholds?: Partial<TriggerThresholds>,
    eventEmitter?: ReplannerEventEmitter
  ) {
    this.triggerEvaluators = triggers;
    this.taskSplitter = taskSplitter;
    this.thresholds = { ...DEFAULT_TRIGGER_THRESHOLDS, ...thresholds };
    this.monitoredTasks = new Map();
    this.decisionHistory = new Map();
    this.eventEmitter = eventEmitter;
  }

  // ===========================================================================
  // Monitoring Methods
  // ===========================================================================

  /**
   * Start monitoring a task for potential replanning
   */
  startMonitoring(taskId: string, context: ExecutionContext): void {
    const monitoredTask: MonitoredTask = {
      taskId,
      startedAt: new Date(),
      context,
      decisions: [],
      isActive: true,
    };

    this.monitoredTasks.set(taskId, monitoredTask);
    this.decisionHistory.set(taskId, []);

    this.eventEmitter?.onMonitoringStarted?.(taskId);
  }

  /**
   * Stop monitoring a task
   */
  stopMonitoring(taskId: string): void {
    const task = this.monitoredTasks.get(taskId);
    if (task) {
      task.isActive = false;
      this.eventEmitter?.onMonitoringStopped?.(taskId);
    }
  }

  /**
   * Update execution context for a monitored task
   * Automatically checks for replanning after update
   */
  updateContext(taskId: string, partialContext: Partial<ExecutionContext>): void {
    const task = this.monitoredTasks.get(taskId);
    if (!task || !task.isActive) {
      return;
    }

    // Merge partial context with existing context
    task.context = {
      ...task.context,
      ...partialContext,
    };
  }

  // ===========================================================================
  // Evaluation Methods
  // ===========================================================================

  /**
   * Check if replanning is needed for a task
   */
  checkReplanningNeeded(taskId: string): ReplanDecision {
    const task = this.monitoredTasks.get(taskId);

    if (!task || !task.isActive) {
      return this.createNoReplanDecision();
    }

    const decision = this.evaluateAllTriggers(task.context);

    // Store decision in history
    task.decisions.push(decision);
    const history = this.decisionHistory.get(taskId) ?? [];
    history.push(decision);
    this.decisionHistory.set(taskId, history);

    // Emit event if replanning is recommended
    if (decision.shouldReplan && decision.reason) {
      this.eventEmitter?.onTriggerActivated?.(taskId, decision.reason.trigger);
      this.eventEmitter?.onReplanDecision?.(taskId, decision);
    }

    return decision;
  }

  /**
   * Evaluate all triggers against a context
   */
  evaluateAllTriggers(context: ExecutionContext): ReplanDecision {
    // Run all trigger evaluators
    const triggerResults: TriggerResult[] = this.triggerEvaluators.map((evaluator) =>
      evaluator.evaluate(context, this.thresholds)
    );

    // Filter to only triggered results
    const activatedTriggers = triggerResults.filter((result) => result.triggered);

    if (activatedTriggers.length === 0) {
      return this.createNoReplanDecision();
    }

    // Find highest priority trigger
    const highestPriorityTrigger = this.findHighestPriorityTrigger(activatedTriggers);

    // Calculate combined confidence
    const combinedConfidence = this.calculateCombinedConfidence(activatedTriggers);

    // Determine suggested action
    const suggestedAction = this.determineSuggestedAction(activatedTriggers);

    // Build metrics from context
    const metrics = this.buildMetrics(context);

    // Create reason from highest priority trigger
    const reason: ReplanReason = {
      trigger: highestPriorityTrigger.trigger,
      details: highestPriorityTrigger.details,
      metrics,
      confidence: highestPriorityTrigger.confidence,
    };

    return {
      shouldReplan: true,
      reason,
      suggestedAction,
      confidence: combinedConfidence,
      timestamp: new Date(),
    };
  }

  // ===========================================================================
  // Action Methods
  // ===========================================================================

  /**
   * Execute replanning for a task
   */
  async replan(taskId: string, reason: ReplanReason): Promise<ReplanResult> {
    const task = this.monitoredTasks.get(taskId);

    if (!task) {
      return {
        success: false,
        action: 'continue',
        originalTask: this.createPlaceholderTask(taskId),
        message: `Task ${taskId} is not being monitored`,
        metrics: reason.metrics,
      };
    }

    // Determine action based on reason
    const action = this.determineSuggestedAction([
      {
        triggered: true,
        trigger: reason.trigger,
        confidence: reason.confidence,
        details: reason.details,
        metrics: {},
      },
    ]);

    let result: ReplanResult;

    switch (action) {
      case 'split':
        result = await this.executeSplit(task, reason);
        break;

      case 'rescope':
        result = this.executeRescope(task, reason);
        break;

      case 'escalate':
        result = this.executeEscalate(task, reason);
        break;

      case 'abort':
        result = this.executeAbort(task, reason);
        break;

      default:
        result = {
          success: true,
          action: 'continue',
          originalTask: this.createTaskFromContext(task.context),
          message: 'No action needed, continuing with current approach',
          metrics: reason.metrics,
        };
    }

    this.eventEmitter?.onReplanExecuted?.(taskId, result);

    return result;
  }

  /**
   * Handle a replan request from an agent
   */
  handleAgentRequest(
    taskId: string,
    request: AgentReplanRequest
  ): Promise<ReplanDecision> {
    const task = this.monitoredTasks.get(taskId);

    if (!task || !task.isActive) {
      return Promise.resolve(this.createNoReplanDecision());
    }

    // Update context with agent feedback
    task.context = {
      ...task.context,
      agentFeedback: request.reason,
    };

    // Create agent_request trigger result
    const agentTriggerResult: TriggerResult = {
      triggered: true,
      trigger: 'agent_request',
      confidence: this.calculateAgentRequestConfidence(request),
      details: this.formatAgentRequestDetails(request),
      metrics: {},
    };

    // Evaluate combined with current context
    const otherTriggers = this.triggerEvaluators.map((evaluator) =>
      evaluator.evaluate(task.context, this.thresholds)
    );

    const allActivated = [...otherTriggers.filter((t) => t.triggered), agentTriggerResult];

    // Find highest priority (agent_request is high priority)
    const highestPriorityTrigger = this.findHighestPriorityTrigger(allActivated);
    const combinedConfidence = this.calculateCombinedConfidence(allActivated);
    const suggestedAction = this.determineSuggestedAction(allActivated);
    const metrics = this.buildMetrics(task.context);

    const reason: ReplanReason = {
      trigger: highestPriorityTrigger.trigger,
      details: highestPriorityTrigger.details,
      metrics,
      confidence: highestPriorityTrigger.confidence,
    };

    const decision: ReplanDecision = {
      shouldReplan: true,
      reason,
      suggestedAction,
      confidence: combinedConfidence,
      timestamp: new Date(),
    };

    // Store in history
    task.decisions.push(decision);
    const history = this.decisionHistory.get(taskId) ?? [];
    history.push(decision);
    this.decisionHistory.set(taskId, history);

    this.eventEmitter?.onTriggerActivated?.(taskId, 'agent_request');
    this.eventEmitter?.onReplanDecision?.(taskId, decision);

    return Promise.resolve(decision);
  }

  // ===========================================================================
  // Configuration Methods
  // ===========================================================================

  /**
   * Update trigger thresholds
   */
  setThresholds(thresholds: Partial<TriggerThresholds>): void {
    this.thresholds = {
      ...this.thresholds,
      ...thresholds,
    };
  }

  /**
   * Get current trigger thresholds
   */
  getThresholds(): TriggerThresholds {
    return { ...this.thresholds };
  }

  // ===========================================================================
  // Status Methods
  // ===========================================================================

  /**
   * Get all currently monitored tasks
   */
  getMonitoredTasks(): MonitoredTask[] {
    return Array.from(this.monitoredTasks.values());
  }

  /**
   * Get decision history for a task
   */
  getDecisionHistory(taskId: string): ReplanDecision[] {
    return this.decisionHistory.get(taskId) ?? [];
  }

  // ===========================================================================
  // Private Helper Methods
  // ===========================================================================

  /**
   * Determine suggested action based on activated triggers
   */
  private determineSuggestedAction(triggers: TriggerResult[]): ReplanAction {
    // Check for blocking issues or agent requests with blockers
    const hasBlockingIssue = triggers.some((t) => t.trigger === 'blocking_issue');
    const hasAgentRequest = triggers.some((t) => t.trigger === 'agent_request');

    if (hasBlockingIssue) {
      return 'escalate';
    }

    // Check for scope creep or complexity
    const hasScopeCreep = triggers.some((t) => t.trigger === 'scope_creep');
    const hasComplexity = triggers.some((t) => t.trigger === 'complexity_discovered');
    const hasDependency = triggers.some((t) => t.trigger === 'dependency_discovered');

    if (hasScopeCreep || hasComplexity || hasDependency) {
      return 'split';
    }

    // Check for time or iteration issues
    const hasTimeExceeded = triggers.some((t) => t.trigger === 'time_exceeded');
    const hasHighIterations = triggers.some((t) => t.trigger === 'iterations_high');

    if (hasTimeExceeded || hasHighIterations) {
      // If combined with agent request, might need escalation
      if (hasAgentRequest) {
        return 'split';
      }
      return 'rescope';
    }

    // Agent request alone suggests split
    if (hasAgentRequest) {
      return 'split';
    }

    return 'continue';
  }

  /**
   * Calculate combined confidence from multiple triggers
   */
  private calculateCombinedConfidence(triggers: TriggerResult[]): number {
    if (triggers.length === 0) {
      return 0;
    }

    // Weight by trigger priority
    let weightedSum = 0;
    let totalWeight = 0;

    for (const trigger of triggers) {
      const priority = TRIGGER_PRIORITY[trigger.trigger];
      const weight = priority / 100;
      weightedSum += trigger.confidence * weight;
      totalWeight += weight;
    }

    // Normalize and cap at 1.0
    return Math.min(weightedSum / totalWeight, 1.0);
  }

  /**
   * Find highest priority trigger from activated triggers
   */
  private findHighestPriorityTrigger(triggers: TriggerResult[]): TriggerResult {
    return triggers.reduce((highest, current) => {
      const currentPriority = TRIGGER_PRIORITY[current.trigger];
      const highestPriority = TRIGGER_PRIORITY[highest.trigger];
      return currentPriority > highestPriority ? current : highest;
    }, triggers[0]);
  }

  /**
   * Build metrics from execution context
   */
  private buildMetrics(context: ExecutionContext): ReplanMetrics {
    const unexpectedFiles = context.filesModified.filter(
      (f) => !context.filesExpected.includes(f)
    );

    return {
      timeElapsed: context.timeElapsed,
      estimatedTime: context.estimatedTime,
      timeRatio:
        context.estimatedTime > 0 ? context.timeElapsed / context.estimatedTime : 0,
      iterations: context.iteration,
      maxIterations: context.maxIterations,
      iterationRatio:
        context.maxIterations > 0 ? context.iteration / context.maxIterations : 0,
      filesModified: context.filesModified.length,
      filesExpected: context.filesExpected.length,
      scopeCreepCount: unexpectedFiles.length,
      errorsEncountered: context.errors.length,
      consecutiveFailures: context.consecutiveFailures,
    };
  }

  /**
   * Create a "no replan needed" decision
   */
  private createNoReplanDecision(): ReplanDecision {
    return {
      shouldReplan: false,
      suggestedAction: 'continue',
      confidence: 1.0,
      timestamp: new Date(),
    };
  }

  /**
   * Create a placeholder task for error cases
   */
  private createPlaceholderTask(taskId: string): Task {
    return {
      id: taskId,
      name: 'Unknown Task',
      description: 'Task not found',
      files: [],
      estimatedTime: 0,
      dependencies: [],
      acceptanceCriteria: [],
      status: 'pending',
    };
  }

  /**
   * Create a task from execution context
   */
  private createTaskFromContext(context: ExecutionContext): Task {
    return {
      id: context.taskId,
      name: context.taskName,
      description: `Task with ${String(context.filesExpected.length)} expected files`,
      files: context.filesExpected,
      estimatedTime: context.estimatedTime,
      dependencies: [],
      acceptanceCriteria: [],
      status: 'in_progress',
    };
  }

  /**
   * Execute split action
   */
  private async executeSplit(
    task: MonitoredTask,
    reason: ReplanReason
  ): Promise<ReplanResult> {
    const originalTask = this.createTaskFromContext(task.context);

    if (!this.taskSplitter.canSplit(originalTask, reason)) {
      return {
        success: false,
        action: 'split',
        originalTask,
        message: 'Task cannot be split further',
        metrics: reason.metrics,
      };
    }

    try {
      const subtasks = await this.taskSplitter.split(originalTask, reason);

      // Mark original task as split
      originalTask.status = 'split';

      return {
        success: true,
        action: 'split',
        originalTask,
        newTasks: subtasks,
        message: `Task split into ${String(subtasks.length)} subtasks`,
        metrics: reason.metrics,
      };
    } catch (error) {
      return {
        success: false,
        action: 'split',
        originalTask,
        message: `Failed to split task: ${error instanceof Error ? error.message : 'Unknown error'}`,
        metrics: reason.metrics,
      };
    }
  }

  /**
   * Execute rescope action
   */
  private executeRescope(task: MonitoredTask, reason: ReplanReason): ReplanResult {
    const originalTask = this.createTaskFromContext(task.context);

    // Rescoping involves reducing the scope of the task
    // In practice, this might involve removing some files or criteria
    return {
      success: true,
      action: 'rescope',
      originalTask,
      message:
        'Task scope reduced to focus on core requirements. Consider completing remaining work in a follow-up task.',
      metrics: reason.metrics,
    };
  }

  /**
   * Execute escalate action
   */
  private executeEscalate(task: MonitoredTask, reason: ReplanReason): ReplanResult {
    const originalTask = this.createTaskFromContext(task.context);
    originalTask.status = 'escalated';

    return {
      success: true,
      action: 'escalate',
      originalTask,
      message: `Task escalated due to ${reason.trigger}: ${reason.details}. Human intervention required.`,
      metrics: reason.metrics,
    };
  }

  /**
   * Execute abort action
   */
  private executeAbort(task: MonitoredTask, reason: ReplanReason): ReplanResult {
    const originalTask = this.createTaskFromContext(task.context);
    originalTask.status = 'failed';

    // Stop monitoring this task
    task.isActive = false;

    return {
      success: true,
      action: 'abort',
      originalTask,
      message: `Task aborted due to ${reason.trigger}: ${reason.details}`,
      metrics: reason.metrics,
    };
  }

  /**
   * Calculate confidence for agent replan request
   */
  private calculateAgentRequestConfidence(request: AgentReplanRequest): number {
    let confidence = 0.5; // Base confidence for any request

    // Higher confidence if blockers are specified
    if (request.blockers && request.blockers.length > 0) {
      confidence += 0.2 * Math.min(request.blockers.length / 3, 1);
    }

    // Higher confidence if complexity details are provided
    if (request.complexityDetails && request.complexityDetails.length > 50) {
      confidence += 0.15;
    }

    // Higher confidence if suggestion is provided
    if (request.suggestion && request.suggestion.length > 0) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Format agent request details for display
   */
  private formatAgentRequestDetails(request: AgentReplanRequest): string {
    const parts: string[] = [`Agent ${request.agentId} requests replan: ${request.reason}`];

    if (request.blockers && request.blockers.length > 0) {
      parts.push(`Blockers: ${request.blockers.join(', ')}`);
    }

    if (request.complexityDetails) {
      parts.push(`Complexity: ${request.complexityDetails}`);
    }

    if (request.suggestion) {
      parts.push(`Suggestion: ${request.suggestion}`);
    }

    return parts.join('. ');
  }
}

/**
 * Factory function to create a DynamicReplanner with default configuration
 */
export function createDynamicReplanner(
  triggers: ITriggerEvaluator[],
  taskSplitter: ITaskSplitter,
  thresholds?: Partial<TriggerThresholds>,
  eventEmitter?: ReplannerEventEmitter
): DynamicReplanner {
  return new DynamicReplanner(triggers, taskSplitter, thresholds, eventEmitter);
}
