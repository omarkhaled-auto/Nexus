/**
 * useNexusEvents - Hook for subscribing to Nexus backend events
 *
 * Phase 19 Task 5: Wires Backend -> UI Events
 * Phase 20 Task 4: Added planning:completed event handling
 *
 * This hook subscribes to all Nexus events from the main process via IPC
 * and dispatches them to the appropriate Zustand stores for real-time UI updates.
 *
 * Events handled:
 * - Interview events (interview:started, interview:completed, etc.)
 * - Planning events (planning:completed) - Phase 20
 * - Task events (task:assigned, task:started, task:completed, task:failed, task:escalated)
 * - Project events (project:status-changed, project:completed, project:failed)
 * - QA events (qa:build-completed, qa:lint-completed, qa:test-completed, qa:review-completed)
 * - System events (system:checkpoint-created, system:error)
 */

import { useEffect, useRef } from 'react';
import { useTaskStore } from '../stores/taskStore';
import { useFeatureStore } from '../stores/featureStore';
import { useProjectStore } from '../stores/projectStore';
import { useAgentStore } from '../stores/agentStore';
import { useInterviewStore } from '../stores/interviewStore';
import { useMetricsStore } from '../stores/metricsStore';
import { toast } from '../lib/toast';

/** Type for Nexus events from the main process */
interface NexusEvent {
  type: string;
  payload: unknown;
  timestamp: Date;
}

/** Type guard helpers for event payloads */
interface TaskEventPayload {
  taskId: string;
  agentId?: string;
  result?: unknown;
  error?: string;
  iterations?: number;
  reason?: string;
}

interface ProjectEventPayload {
  projectId: string;
  previousStatus?: string;
  newStatus?: string;
  reason?: string;
  error?: string;
}

interface InterviewEventPayload {
  projectId: string;
  totalRequirements?: number;
  categories?: string[];
  duration?: number;
  question?: string;
  requirementId?: string;
  text?: string;
  priority?: string;
  category?: string;
}

interface QAEventPayload {
  taskId: string;
  success: boolean;
  output?: string;
  errors?: string[];
  duration?: number;
}

interface SystemEventPayload {
  checkpointId?: string;
  projectId?: string;
  reason?: string;
  error?: string;
  recoverable?: boolean;
}

interface PlanningEventPayload {
  projectId: string;
  featureCount?: number;
  taskCount?: number;
}

/** Phase 2 addition: Wave event payload */
interface WaveEventPayload {
  waveId: number;
  projectId?: string;
}

/** Phase 2 addition: Checkpoint event payload */
interface CheckpointEventPayload {
  checkpointId?: string;
  waveId?: number;
  reason?: string;
  error?: string;
}

/** Phase 2 addition: Task status change payload */
interface TaskStatusChangePayload {
  taskId: string;
  oldStatus: string;
  newStatus: string;
  featureId?: string;
}

/** Phase 2 addition: Feature event payload */
interface FeatureEventPayload {
  featureId: string;
  projectId?: string;
  tasksCompleted?: number;
  previousStatus?: string;
  newStatus?: string;
}

/**
 * Hook to subscribe to Nexus backend events
 *
 * Call this once at the app root level (e.g., in SettingsInitializer or App)
 * to set up the event bridge between main process and UI stores.
 */
export function useNexusEvents(): void {
  const isSubscribed = useRef(false);

  // Get store actions
  const updateTask = useTaskStore((s) => s.updateTask);
  const addTask = useTaskStore((s) => s.addTask);
  const loadTasks = useTaskStore((s) => s.loadTasks);

  const loadFeatures = useFeatureStore((s) => s.loadFeatures);
  const updateFeatureFromTaskCompletion = useFeatureStore((s) => s.updateFeatureFromTaskCompletion);
  const updateFeatureStatusFromTasks = useFeatureStore((s) => s.updateFeatureStatusFromTasks);

  const setProject = useProjectStore((s) => s.setProject);

  const updateAgent = useAgentStore((s) => s.updateAgent);

  const setStage = useInterviewStore((s) => s.setStage);
  const addRequirement = useInterviewStore((s) => s.addRequirement);

  const refreshMetrics = useMetricsStore((s) => s.loadMetrics);

  useEffect(() => {
    // Prevent double subscription in strict mode
    if (isSubscribed.current) return;

    // Check if nexusAPI is available (Electron context)
    if (typeof window.nexusAPI === 'undefined') {
      console.warn('[useNexusEvents] nexusAPI not available, skipping event subscription');
      return;
    }

    // Check if onNexusEvent is available
    if (typeof window.nexusAPI.onNexusEvent !== 'function') {
      console.warn('[useNexusEvents] onNexusEvent not available, skipping event subscription');
      return;
    }

    console.log('[useNexusEvents] Subscribing to Nexus backend events');
    isSubscribed.current = true;

    const handleNexusEvent = (event: NexusEvent): void => {
      const { type, payload } = event;

      console.log(`[useNexusEvents] Received: ${type}`, payload);

      try {
        switch (type) {
          // ========================================
          // Task Events
          // ========================================
          case 'task:assigned': {
            const p = payload as TaskEventPayload;
            updateTask(p.taskId, {
              status: 'pending',
              assignedAgent: p.agentId,
            });
            // CRITICAL FIX: Update feature when task is assigned
            const assignedFeatureId = (payload as Record<string, unknown>).featureId as string | undefined;
            if (assignedFeatureId) {
              updateFeatureStatusFromTasks(assignedFeatureId);
            }
            break;
          }

          case 'task:started': {
            const p = payload as TaskEventPayload;
            updateTask(p.taskId, { status: 'in_progress' });
            // Update agent status
            if (p.agentId) {
              updateAgent(p.agentId, { status: 'working' });
            }
            // CRITICAL FIX: Update feature when task starts (moves feature from backlog to in_progress)
            const startedFeatureId = (payload as Record<string, unknown>).featureId as string | undefined;
            if (startedFeatureId) {
              updateFeatureStatusFromTasks(startedFeatureId);
            }
            break;
          }

          case 'task:completed': {
            const p = payload as TaskEventPayload;
            updateTask(p.taskId, { status: 'completed' });
            // Phase 2 fix: Update feature when task completes
            // The payload may include featureId from the backend
            const featureId = (payload as Record<string, unknown>).featureId as string | undefined;
            if (featureId) {
              updateFeatureFromTaskCompletion(featureId);
              updateFeatureStatusFromTasks(featureId);
            }
            // Refresh metrics to update progress
            void refreshMetrics();
            break;
          }

          case 'task:failed': {
            const p = payload as TaskEventPayload;
            updateTask(p.taskId, { status: 'failed' });
            toast.error(`Task failed: ${p.error || 'Unknown error'}`);
            break;
          }

          case 'task:escalated': {
            const p = payload as TaskEventPayload;
            updateTask(p.taskId, { status: 'failed' });
            toast.warning(`Task escalated for human review: ${p.reason || 'Max iterations exceeded'}`);
            break;
          }

          // ========================================
          // Project Events
          // ========================================
          case 'project:status-changed': {
            const p = payload as ProjectEventPayload;
            // Update project status in store if we have a current project
            console.log(`[useNexusEvents] Project ${p.projectId} status: ${p.previousStatus ?? 'unknown'} -> ${p.newStatus ?? 'unknown'}`);
            break;
          }

          case 'project:completed': {
            toast.success('Project completed successfully!');
            break;
          }

          case 'project:failed': {
            const p = payload as ProjectEventPayload;
            toast.error(`Project failed: ${p.error || 'Unknown error'}`);
            break;
          }

          // ========================================
          // Interview Events
          // ========================================
          case 'interview:started': {
            setStage('functional'); // Start with functional stage
            break;
          }

          case 'interview:completed': {
            const p = payload as InterviewEventPayload;
            setStage('complete');
            toast.success(`Interview completed with ${p.totalRequirements || 0} requirements captured`);
            break;
          }

          case 'interview:requirement-captured': {
            const p = payload as InterviewEventPayload;
            if (p.requirementId && p.text) {
              const now = Date.now();
              addRequirement({
                id: p.requirementId,
                text: p.text,
                category: (p.category || 'functional') as 'functional' | 'technical' | 'ui' | 'constraint',
                priority: (p.priority || 'should') as 'must' | 'should' | 'could' | 'wont',
                source: 'interview' as const,
                createdAt: now,
                updatedAt: now,
                confirmed: false,
              });
            }
            break;
          }

          // ========================================
          // Planning Events (Phase 20 Task 4)
          // ========================================
          case 'planning:completed': {
            const p = payload as PlanningEventPayload;
            console.log('[useNexusEvents] Planning completed for project:', p.projectId);

            // Refresh features and tasks from backend (filtered by projectId)
            void loadFeatures(p.projectId);
            void loadTasks(p.projectId);

            // Refresh metrics
            void refreshMetrics();

            // Show notification
            toast.success(`Planning complete! ${p.taskCount ?? 0} tasks created across ${p.featureCount ?? 0} features.`);
            break;
          }

          // ========================================
          // QA Events
          // ========================================
          case 'qa:build-completed':
          case 'qa:lint-completed':
          case 'qa:test-completed':
          case 'qa:review-completed': {
            const p = payload as QAEventPayload;
            const stepType = type.split(':')[1]?.replace('-completed', '') || 'unknown';
            if (!p.success) {
              toast.error(`QA ${stepType} failed for task`);
            }
            break;
          }

          // ========================================
          // System Events
          // ========================================
          case 'system:checkpoint-created': {
            const p = payload as SystemEventPayload;
            console.log(`[useNexusEvents] Checkpoint created: ${p.checkpointId ?? 'unknown'}, reason: ${p.reason ?? 'Manual checkpoint'}`);
            break;
          }

          case 'system:error': {
            const p = payload as SystemEventPayload;
            toast.error(`System error: ${p.error || 'Unknown error'}`);
            break;
          }

          // ========================================
          // Wave Events (Phase 2 addition)
          // ========================================
          case 'wave:started': {
            const p = payload as WaveEventPayload;
            console.log(`[useNexusEvents] Wave ${p.waveId} started`);
            break;
          }

          case 'wave:completed': {
            const p = payload as WaveEventPayload;
            console.log(`[useNexusEvents] Wave ${p.waveId} completed`);
            void refreshMetrics();
            break;
          }

          // ========================================
          // Checkpoint Events (Phase 2 addition)
          // ========================================
          case 'checkpoint:created': {
            const p = payload as CheckpointEventPayload;
            console.log(`[useNexusEvents] Checkpoint created: ${p.checkpointId ?? 'unknown'}, reason: ${p.reason ?? 'Wave checkpoint'}`);
            break;
          }

          case 'checkpoint:failed': {
            const p = payload as CheckpointEventPayload;
            console.warn(`[useNexusEvents] Checkpoint failed: ${p.error ?? 'Unknown error'}`);
            break;
          }

          // ========================================
          // Task Status Change (Phase 2 addition)
          // ========================================
          case 'task:status-changed': {
            const p = payload as TaskStatusChangePayload;
            console.log(`[useNexusEvents] Task ${p.taskId} status: ${p.oldStatus} -> ${p.newStatus}`);
            updateTask(p.taskId, { status: p.newStatus as 'pending' | 'in_progress' | 'completed' | 'failed' });

            // Phase 2 fix: If task has featureId, update feature status
            if (p.featureId) {
              updateFeatureStatusFromTasks(p.featureId);
              if (p.newStatus === 'completed') {
                updateFeatureFromTaskCompletion(p.featureId);
              }
              void refreshMetrics();
            }
            break;
          }

          // ========================================
          // Coordinator Events (Phase 2 addition)
          // ========================================
          case 'coordinator:started': {
            console.log('[useNexusEvents] Coordinator started');
            break;
          }

          case 'coordinator:paused': {
            console.log('[useNexusEvents] Coordinator paused');
            toast.info('Execution paused');
            break;
          }

          case 'coordinator:resumed': {
            console.log('[useNexusEvents] Coordinator resumed');
            toast.info('Execution resumed');
            break;
          }

          case 'coordinator:stopped': {
            console.log('[useNexusEvents] Coordinator stopped');
            break;
          }

          // ========================================
          // Feature Events (Phase 2 addition)
          // ========================================
          case 'feature:status-changed': {
            const p = payload as FeatureEventPayload;
            console.log(`[useNexusEvents] Feature ${p.featureId} status: ${p.previousStatus ?? 'unknown'} -> ${p.newStatus ?? 'unknown'}`);
            void loadFeatures(p.projectId);
            break;
          }

          case 'feature:completed': {
            const p = payload as FeatureEventPayload;
            console.log(`[useNexusEvents] Feature ${p.featureId} completed`);
            toast.success('Feature completed!');
            void loadFeatures(p.projectId);
            void refreshMetrics();
            break;
          }

          default:
            // Log unhandled events for debugging
            console.log(`[useNexusEvents] Unhandled event: ${type}`);
        }
      } catch (error) {
        console.error(`[useNexusEvents] Error handling event ${type}:`, error);
      }
    };

    // Subscribe to events
    const unsubscribe = window.nexusAPI.onNexusEvent(handleNexusEvent);

    // Cleanup on unmount
    return () => {
      console.log('[useNexusEvents] Unsubscribing from Nexus backend events');
      isSubscribed.current = false;
      unsubscribe();
    };
  }, [
    updateTask,
    addTask,
    loadTasks,
    loadFeatures,
    updateFeatureFromTaskCompletion,
    updateFeatureStatusFromTasks,
    setProject,
    updateAgent,
    setStage,
    addRequirement,
    refreshMetrics,
  ]);
}

/**
 * Setup function for one-time initialization outside React lifecycle
 * Use this if you need to set up event handling before React renders
 */
export function setupNexusEventHandler(): (() => void) | null {
  if (typeof window.nexusAPI === 'undefined' || typeof window.nexusAPI.onNexusEvent !== 'function') {
    console.warn('[setupNexusEventHandler] nexusAPI not available');
    return null;
  }

  console.log('[setupNexusEventHandler] Setting up Nexus event handler');

  const handleEvent = (event: NexusEvent): void => {
    console.log(`[NexusEventHandler] Event: ${event.type}`, event.payload);
    // Dispatch to stores - this is called from outside React
    // Each store will need to expose a way to handle these events
  };

  return window.nexusAPI.onNexusEvent(handleEvent);
}

export default useNexusEvents;
