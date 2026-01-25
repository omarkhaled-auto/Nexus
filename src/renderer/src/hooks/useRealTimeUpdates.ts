/**
 * useRealTimeUpdates - Hook for subscribing to real-time dashboard events
 *
 * Phase 19 Task 16: Wire Real-time UI Updates
 *
 * This hook subscribes to all real-time events from the main process that are
 * NOT handled by useNexusEvents. It complements useNexusEvents by handling:
 * - Dashboard metrics updates (metrics:updated)
 * - Timeline events (timeline:event)
 * - Cost updates (costs:updated)
 * - Agent metrics/status updates (agent:metrics, agent:status)
 * - Execution progress (execution:progress)
 * - Execution logs (execution:log)
 * - Feature updates (feature:updated)
 *
 * Call this hook at the app root level alongside useNexusEvents.
 */

import { useEffect, useRef } from 'react';
import { useMetricsStore } from '../stores/metricsStore';
import { useAgentStore, type AgentStatus } from '../stores/agentStore';
import { useFeatureStore } from '../stores/featureStore';
import type { OverviewMetrics, TimelineEvent, AgentMetrics, CostMetrics } from '../types/metrics';

/**
 * Type guards and payload interfaces for real-time events
 */
interface MetricsUpdatePayload extends OverviewMetrics {}

interface TimelineEventPayload {
  id: string;
  type: string;
  title: string;
  description?: string;
  severity?: string;
  timestamp: Date | string;
  metadata?: Record<string, unknown>;
}

interface CostUpdatePayload {
  totalTokensUsed: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUSD: number;
  totalCost?: number;
  breakdownByModel?: Array<{
    model: string;
    provider: string;
    inputTokens: number;
    outputTokens: number;
    costUSD: number;
  }>;
  breakdownByAgent?: Array<{
    agentType: string;
    tokensUsed: number;
    costUSD: number;
    taskCount: number;
  }>;
  updatedAt?: Date | string;
}

interface AgentMetricsPayload {
  id: string;
  type?: string;
  status?: string;
  currentTaskId?: string;
  currentTaskName?: string;
  tasksCompleted?: number;
  tasksFailed?: number;
  tokensUsed?: number;
}

interface AgentStatusPayload {
  id: string;
  type: string;
  status: string;
  currentTaskId?: string;
}

interface ExecutionProgressPayload {
  completedTasks: number;
  totalTasks: number;
  currentPhase?: string;
  estimatedRemainingMinutes?: number;
}

interface ExecutionLogPayload {
  stepType: string;
  log: {
    id: string;
    timestamp: Date | string;
    level: string;
    message: string;
    details?: unknown;
  };
}

interface FeatureUpdatePayload {
  id: string;
  title?: string;
  status?: string;
  description?: string;
  priority?: string;
  complexity?: string;
}

/**
 * Hook to subscribe to real-time dashboard and execution events
 *
 * Call this once at the app root level (e.g., in SettingsInitializer or App)
 * to set up event subscriptions for dashboard metrics, agent activity, etc.
 */
export function useRealTimeUpdates(): void {
  const isSubscribed = useRef(false);

  // Get store actions
  const setOverview = useMetricsStore((s) => s.setOverview);
  const addTimelineEvent = useMetricsStore((s) => s.addTimelineEvent);
  const setCosts = useMetricsStore((s) => s.setCosts);
  const updateAgentMetrics = useMetricsStore((s) => s.updateAgentMetrics);
  const setAgents = useMetricsStore((s) => s.setAgents);

  const setAgentStatus = useAgentStore((s) => s.setAgentStatus);
  const updateAgent = useAgentStore((s) => s.updateAgent);

  const updateFeature = useFeatureStore((s) => s.updateFeature);

  useEffect(() => {
    // Prevent double subscription in strict mode
    if (isSubscribed.current) return;

    // Check if nexusAPI is available (Electron context)
    if (typeof window.nexusAPI === 'undefined') {
      console.warn('[useRealTimeUpdates] nexusAPI not available, skipping subscriptions');
      return;
    }

    console.log('[useRealTimeUpdates] Setting up real-time event subscriptions');
    isSubscribed.current = true;

    const unsubscribers: Array<() => void> = [];

    // ========================================
    // Dashboard Metrics Subscriptions
    // ========================================

    // Subscribe to overview metrics updates
    if (typeof window.nexusAPI.onMetricsUpdate === 'function') {
      const unsubMetrics = window.nexusAPI.onMetricsUpdate((metrics) => {
        console.log('[useRealTimeUpdates] Metrics update received', metrics);
        try {
          const payload = metrics as MetricsUpdatePayload;
          setOverview(payload);
        } catch (error) {
          console.error('[useRealTimeUpdates] Error processing metrics update:', error);
        }
      });
      unsubscribers.push(unsubMetrics);
    } else {
      console.warn('[useRealTimeUpdates] onMetricsUpdate not available - real-time metrics updates disabled');
    }

    // Subscribe to timeline events
    if (typeof window.nexusAPI.onTimelineEvent === 'function') {
      const unsubTimeline = window.nexusAPI.onTimelineEvent((event) => {
        console.log('[useRealTimeUpdates] Timeline event received', event);
        try {
          const payload = event as TimelineEventPayload;
          const timelineEvent: TimelineEvent = {
            id: payload.id,
            type: payload.type as TimelineEvent['type'],
            title: payload.title,
            description: payload.description,
            severity: (payload.severity as TimelineEvent['severity']) || 'info',
            timestamp: new Date(payload.timestamp),
            metadata: payload.metadata,
          };
          addTimelineEvent(timelineEvent);
        } catch (error) {
          console.error('[useRealTimeUpdates] Error processing timeline event:', error);
        }
      });
      unsubscribers.push(unsubTimeline);
    } else {
      console.warn('[useRealTimeUpdates] onTimelineEvent not available - timeline updates disabled');
    }

    // Subscribe to cost updates
    if (typeof window.nexusAPI.onCostUpdate === 'function') {
      const unsubCosts = window.nexusAPI.onCostUpdate((costs) => {
        console.log('[useRealTimeUpdates] Cost update received', costs);
        try {
          const payload = costs as CostUpdatePayload;
          const costMetrics: CostMetrics = {
            totalTokensUsed: payload.totalTokensUsed,
            inputTokens: payload.inputTokens,
            outputTokens: payload.outputTokens,
            estimatedCostUSD: payload.estimatedCostUSD,
            totalCost: payload.totalCost,
            breakdownByModel: (payload.breakdownByModel || []).map((m) => ({
              model: m.model,
              provider: m.provider as 'anthropic' | 'google' | 'openai',
              inputTokens: m.inputTokens,
              outputTokens: m.outputTokens,
              costUSD: m.costUSD,
            })),
            breakdownByAgent: (payload.breakdownByAgent || []).map((a) => ({
              agentType: a.agentType as AgentMetrics['type'],
              tokensUsed: a.tokensUsed,
              costUSD: a.costUSD,
              taskCount: a.taskCount,
            })),
            updatedAt: payload.updatedAt ? new Date(payload.updatedAt) : new Date(),
          };
          setCosts(costMetrics);
        } catch (error) {
          console.error('[useRealTimeUpdates] Error processing cost update:', error);
        }
      });
      unsubscribers.push(unsubCosts);
    } else {
      console.warn('[useRealTimeUpdates] onCostUpdate not available - cost tracking updates disabled');
    }

    // ========================================
    // Agent Status Subscriptions
    // ========================================

    // Subscribe to agent metrics updates (detailed metrics from metricsStore)
    if (typeof window.nexusAPI.onAgentStatusUpdate === 'function') {
      const unsubAgentMetrics = window.nexusAPI.onAgentStatusUpdate((status) => {
        console.log('[useRealTimeUpdates] Agent metrics received', status);
        try {
          const payload = status as AgentMetricsPayload;
          // Update the metrics store with agent activity
          updateAgentMetrics(payload.id, {
            id: payload.id,
            type: (payload.type as AgentMetrics['type']) || 'coder',
            status: (payload.status as AgentMetrics['status']) || 'idle',
            currentTaskId: payload.currentTaskId,
            currentTaskName: payload.currentTaskName,
            tasksCompleted: payload.tasksCompleted || 0,
            tasksFailed: payload.tasksFailed || 0,
            tokensUsed: payload.tokensUsed || 0,
            lastActivity: new Date(),
            spawnedAt: new Date(),
          });
        } catch (error) {
          console.error('[useRealTimeUpdates] Error processing agent metrics:', error);
        }
      });
      unsubscribers.push(unsubAgentMetrics);
    } else {
      console.warn('[useRealTimeUpdates] onAgentStatusUpdate not available - agent metrics updates disabled');
    }

    // Subscribe to agent status changes (for agentStore)
    if (typeof window.nexusAPI.onAgentStatus === 'function') {
      const unsubAgentStatus = window.nexusAPI.onAgentStatus((status) => {
        console.log('[useRealTimeUpdates] Agent status received', status);
        try {
          const payload = status as AgentStatusPayload;
          const agentStatus: AgentStatus = {
            id: payload.id,
            type: (payload.type as AgentStatus['type']) || 'coder',
            status: (payload.status as AgentStatus['status']) || 'idle',
            currentTaskId: payload.currentTaskId,
          };
          setAgentStatus(agentStatus);
        } catch (error) {
          console.error('[useRealTimeUpdates] Error processing agent status:', error);
        }
      });
      unsubscribers.push(unsubAgentStatus);
    } else {
      console.warn('[useRealTimeUpdates] onAgentStatus not available - agent status updates disabled');
    }

    // ========================================
    // Execution Progress Subscriptions
    // ========================================

    // Subscribe to execution progress
    if (typeof window.nexusAPI.onExecutionProgress === 'function') {
      const unsubProgress = window.nexusAPI.onExecutionProgress((progress) => {
        console.log('[useRealTimeUpdates] Execution progress received', progress);
        try {
          const payload = progress as ExecutionProgressPayload;
          // Get current overview and update with progress
          const currentOverview = useMetricsStore.getState().overview;
          if (currentOverview) {
            setOverview({
              ...currentOverview,
              completedTasks: payload.completedTasks,
              totalTasks: payload.totalTasks,
              estimatedRemainingMinutes: payload.estimatedRemainingMinutes ?? currentOverview.estimatedRemainingMinutes,
              updatedAt: new Date(),
            });
          }
        } catch (error) {
          console.error('[useRealTimeUpdates] Error processing execution progress:', error);
        }
      });
      unsubscribers.push(unsubProgress);
    } else {
      console.warn('[useRealTimeUpdates] onExecutionProgress not available - execution progress updates disabled');
    }

    // Subscribe to execution log updates
    if (typeof window.nexusAPI.onExecutionLogUpdate === 'function') {
      const unsubLogs = window.nexusAPI.onExecutionLogUpdate((data) => {
        console.log('[useRealTimeUpdates] Execution log received', data);
        try {
          const payload = data as ExecutionLogPayload;
          // Add execution logs as timeline events
          const logEvent: TimelineEvent = {
            id: payload.log.id,
            type: 'task_started', // Generic type for logs
            title: `[${payload.stepType.toUpperCase()}] ${payload.log.message}`,
            severity: payload.log.level === 'error' ? 'error' : payload.log.level === 'warn' ? 'warning' : 'info',
            timestamp: new Date(payload.log.timestamp),
            metadata: { stepType: payload.stepType, details: payload.log.details },
          };
          addTimelineEvent(logEvent);
        } catch (error) {
          console.error('[useRealTimeUpdates] Error processing execution log:', error);
        }
      });
      unsubscribers.push(unsubLogs);
    } else {
      console.warn('[useRealTimeUpdates] onExecutionLogUpdate not available - execution log updates disabled');
    }

    // ========================================
    // Feature Update Subscriptions
    // ========================================

    // Subscribe to feature updates (for Kanban)
    if (typeof window.nexusAPI.onFeatureUpdate === 'function') {
      const unsubFeature = window.nexusAPI.onFeatureUpdate((feature) => {
        console.log('[useRealTimeUpdates] Feature update received', feature);
        try {
          const payload = feature as FeatureUpdatePayload;
          updateFeature(payload.id, {
            title: payload.title,
            status: payload.status as 'backlog' | 'planning' | 'in_progress' | 'ai_review' | 'human_review' | 'done',
            description: payload.description,
            priority: payload.priority as 'low' | 'medium' | 'high' | 'critical',
            complexity: payload.complexity as 'simple' | 'moderate' | 'complex',
          });
        } catch (error) {
          console.error('[useRealTimeUpdates] Error processing feature update:', error);
        }
      });
      unsubscribers.push(unsubFeature);
    } else {
      console.warn('[useRealTimeUpdates] onFeatureUpdate not available - Kanban real-time updates disabled');
    }

    // Cleanup on unmount
    return () => {
      console.log('[useRealTimeUpdates] Cleaning up subscriptions');
      isSubscribed.current = false;
      unsubscribers.forEach((unsub) => {
        try {
          unsub();
        } catch {
          // Ignore cleanup errors
        }
      });
    };
  }, [
    setOverview,
    addTimelineEvent,
    setCosts,
    updateAgentMetrics,
    setAgents,
    setAgentStatus,
    updateAgent,
    updateFeature,
  ]);
}

export default useRealTimeUpdates;
