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
import { useUIStore } from '../stores/uiStore';

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

  const setProject = useProjectStore((s) => s.setProject);

  const updateAgent = useAgentStore((s) => s.updateAgent);

  const setStage = useInterviewStore((s) => s.setStage);
  const addRequirement = useInterviewStore((s) => s.addRequirement);

  const refreshMetrics = useMetricsStore((s) => s.loadMetrics);

  const addToast = useUIStore((s) => s.addToast);

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
            break;
          }

          case 'task:started': {
            const p = payload as TaskEventPayload;
            updateTask(p.taskId, { status: 'in_progress' });
            // Update agent status
            if (p.agentId) {
              updateAgent(p.agentId, { status: 'working' });
            }
            break;
          }

          case 'task:completed': {
            const p = payload as TaskEventPayload;
            updateTask(p.taskId, { status: 'completed' });
            // Refresh metrics to update progress
            void refreshMetrics();
            break;
          }

          case 'task:failed': {
            const p = payload as TaskEventPayload;
            updateTask(p.taskId, { status: 'failed' });
            addToast({
              id: `task-failed-${p.taskId}`,
              type: 'error',
              message: `Task failed: ${p.error || 'Unknown error'}`,
            });
            break;
          }

          case 'task:escalated': {
            const p = payload as TaskEventPayload;
            updateTask(p.taskId, { status: 'failed' });
            addToast({
              id: `task-escalated-${p.taskId}`,
              type: 'info', // Use 'info' as warning is not supported
              message: `Task escalated for human review: ${p.reason || 'Max iterations exceeded'}`,
            });
            break;
          }

          // ========================================
          // Project Events
          // ========================================
          case 'project:status-changed': {
            const p = payload as ProjectEventPayload;
            // Update project status in store if we have a current project
            console.log(`[useNexusEvents] Project ${p.projectId} status: ${p.previousStatus} -> ${p.newStatus}`);
            break;
          }

          case 'project:completed': {
            const p = payload as ProjectEventPayload;
            addToast({
              id: `project-completed-${p.projectId}`,
              type: 'success',
              message: 'Project completed successfully!',
            });
            break;
          }

          case 'project:failed': {
            const p = payload as ProjectEventPayload;
            addToast({
              id: `project-failed-${p.projectId}`,
              type: 'error',
              message: `Project failed: ${p.error || 'Unknown error'}`,
            });
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
            addToast({
              id: `interview-completed-${p.projectId}`,
              type: 'success',
              message: `Interview completed with ${p.totalRequirements || 0} requirements captured`,
            });
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
            addToast({
              id: `planning-completed-${p.projectId}`,
              type: 'success',
              message: `Planning complete! ${p.taskCount ?? 0} tasks created across ${p.featureCount ?? 0} features.`,
            });
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
              addToast({
                id: `qa-${stepType}-failed-${p.taskId}`,
                type: 'error', // Use 'error' for QA failures
                message: `QA ${stepType} failed for task`,
              });
            }
            break;
          }

          // ========================================
          // System Events
          // ========================================
          case 'system:checkpoint-created': {
            const p = payload as SystemEventPayload;
            addToast({
              id: `checkpoint-created-${p.checkpointId}`,
              type: 'info',
              message: `Checkpoint created: ${p.reason || 'Manual checkpoint'}`,
            });
            break;
          }

          case 'system:error': {
            const p = payload as SystemEventPayload;
            addToast({
              id: `system-error-${Date.now()}`,
              type: 'error',
              message: `System error: ${p.error || 'Unknown error'}`,
            });
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
    setProject,
    updateAgent,
    setStage,
    addRequirement,
    refreshMetrics,
    addToast,
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
