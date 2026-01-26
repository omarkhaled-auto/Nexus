/**
 * Planning Progress Hook
 *
 * Manages the state and logic for the planning phase.
 * Tracks progress as tasks are created after interview completion.
 *
 * Phase 24: Planning Phase Screen implementation
 */

import { create } from 'zustand';
import { useCallback, useEffect } from 'react';
import type {
  PlanningState,
  PlanningStatus,
  PlanningTaskPreview,
  PlanningFeaturePreview,
  PlanningProgressPayload,
} from '@/types/execution';

// ============================================================================
// Planning Store
// ============================================================================

const initialPlanningState: PlanningState = {
  status: 'idle',
  projectId: null,
  progress: 0,
  currentStep: '',
  tasksCreated: [],
  totalTasksExpected: null,
  featuresIdentified: [],
  startedAt: null,
  completedAt: null,
  error: null,
};

interface PlanningStore extends PlanningState {
  // Actions
  startPlanning: (projectId: string) => void;
  updateProgress: (payload: PlanningProgressPayload) => void;
  addTask: (task: PlanningTaskPreview) => void;
  addFeature: (feature: PlanningFeaturePreview) => void;
  setStatus: (status: PlanningStatus) => void;
  setError: (error: string) => void;
  complete: () => void;
  reset: () => void;
}

export const usePlanningStore = create<PlanningStore>()((set) => ({
  ...initialPlanningState,

  startPlanning: (projectId: string) => {
    set({
      ...initialPlanningState,
      status: 'analyzing',
      projectId,
      startedAt: new Date().toISOString(),
      currentStep: 'Analyzing requirements...',
    });
  },

  updateProgress: (payload: PlanningProgressPayload) => {
    set((state) => ({
      ...state,
      status: payload.status,
      progress: payload.progress,
      currentStep: payload.currentStep,
      totalTasksExpected: payload.totalExpected,
    }));
  },

  addTask: (task: PlanningTaskPreview) => {
    set((state) => ({
      ...state,
      tasksCreated: [...state.tasksCreated, task],
    }));
  },

  addFeature: (feature: PlanningFeaturePreview) => {
    set((state) => ({
      ...state,
      featuresIdentified: [...state.featuresIdentified, feature],
    }));
  },

  setStatus: (status: PlanningStatus) => {
    set((state) => ({
      ...state,
      status,
      currentStep: getStepMessageForStatus(status),
    }));
  },

  setError: (error: string) => {
    set((state) => ({
      ...state,
      status: 'error',
      error,
      currentStep: 'An error occurred',
    }));
  },

  complete: () => {
    set((state) => ({
      ...state,
      status: 'complete',
      progress: 100,
      completedAt: new Date().toISOString(),
      currentStep: 'Planning complete!',
    }));
  },

  reset: () => {
    set(initialPlanningState);
  },
}));

// ============================================================================
// Helper Functions
// ============================================================================

function getStepMessageForStatus(status: PlanningStatus): string {
  switch (status) {
    case 'idle':
      return '';
    case 'analyzing':
      return 'Analyzing requirements...';
    case 'decomposing':
      return 'Breaking down into features...';
    case 'creating-tasks':
      return 'Creating tasks...';
    case 'validating':
      return 'Validating dependencies...';
    case 'complete':
      return 'Planning complete!';
    case 'error':
      return 'An error occurred';
    default:
      return '';
  }
}

// ============================================================================
// Main Hook
// ============================================================================

export interface UsePlanningProgressReturn {
  // State
  status: PlanningStatus;
  progress: number;
  currentStep: string;
  tasksCreated: PlanningTaskPreview[];
  featuresIdentified: PlanningFeaturePreview[];
  totalTasksExpected: number | null;
  error: string | null;
  isComplete: boolean;
  isError: boolean;
  isLoading: boolean;

  // Derived
  taskCount: number;
  featureCount: number;
  estimatedTimeRemaining: string | null;

  // Actions
  startPlanning: (projectId: string) => void;
  retry: () => void;
  reset: () => void;
}

/**
 * Hook for tracking planning progress.
 *
 * Usage:
 * ```tsx
 * const { status, progress, tasksCreated, isComplete } = usePlanningProgress();
 * ```
 */
export function usePlanningProgress(): UsePlanningProgressReturn {
  const store = usePlanningStore();

  // Subscribe to IPC events for planning progress
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- nexusAPI may not exist outside Electron
    if (!window.nexusAPI) return;

    // Subscribe to planning progress events
    const unsubProgress = window.nexusAPI.onPlanningProgress((data) => {
      console.log('[usePlanningProgress] Received progress event:', data);
      store.updateProgress({
        projectId: data.projectId,
        status: data.status as PlanningStatus,
        progress: data.progress,
        currentStep: data.currentStep,
        tasksCreated: data.tasksCreated,
        totalExpected: data.totalExpected,
      });
    });

    // Subscribe to planning completed events
    const unsubCompleted = window.nexusAPI.onPlanningCompleted((data) => {
      console.log('[usePlanningProgress] Received completed event:', data);
      // Update progress to complete state
      // Note: Tasks are populated via task:created events, not here
      store.updateProgress({
        projectId: data.projectId,
        status: 'complete',
        progress: 100,
        currentStep: 'Planning complete!',
        tasksCreated: data.taskCount, // This is a count for progress display
        totalExpected: data.taskCount,
      });
      store.complete();
    });

    // Subscribe to planning error events
    const unsubError = window.nexusAPI.onPlanningError((data) => {
      console.log('[usePlanningProgress] Received error event:', data);
      store.setError(data.error);
    });

    // Also subscribe to nexus-event for any planning events not covered above
    const unsubNexus = window.nexusAPI.onNexusEvent((event) => {
      if (event.type === 'planning:started') {
        const payload = event.payload as { projectId: string; requirementCount: number };
        console.log('[usePlanningProgress] Planning started:', payload);
        store.startPlanning(payload.projectId);
      }

      // Subscribe to task:created events to populate the tasks array
      // This fixes the bug where tasks were never displayed during planning
      if (event.type === 'task:created') {
        const payload = event.payload as {
          task: { id: string; name: string; status: string };
          projectId: string;
          featureId?: string;
        };
        console.log('[usePlanningProgress] Task created:', payload);
        store.addTask({
          id: payload.task.id,
          title: payload.task.name,
          status: (payload.task.status as 'pending' | 'created') || 'pending',
          featureId: payload.featureId ?? '',
          priority: 'medium',
          complexity: 'simple',
          estimatedMinutes: 30,
          dependsOn: [],
        });
      }

      // Subscribe to feature:created events to populate features array
      if (event.type === 'feature:created') {
        const payload = event.payload as {
          feature: { id: string; name: string; status: string; priority: string };
          projectId: string;
        };
        console.log('[usePlanningProgress] Feature created:', payload);
        store.addFeature({
          id: payload.feature.id,
          name: payload.feature.name,
          taskCount: 0,
          status: (payload.feature.status as 'identified' | 'decomposing' | 'ready') || 'identified',
        });
      }
    });

    return () => {
      // Cleanup subscriptions
      unsubProgress();
      unsubCompleted();
      unsubError();
      unsubNexus();
    };
  }, [store]);

  // Calculate estimated time remaining
  const estimatedTimeRemaining = useCallback((): string | null => {
    if (store.status === 'complete' || store.status === 'error' || store.status === 'idle') {
      return null;
    }

    if (store.progress === 0) {
      return 'Calculating...';
    }

    // Rough estimate based on progress
    const avgTaskTime = 5; // seconds per task
    const remainingTasks = (store.totalTasksExpected ?? 10) - store.tasksCreated.length;
    const remainingSeconds = remainingTasks * avgTaskTime;

    if (remainingSeconds < 60) {
      return `About ${Math.max(remainingSeconds, 1)} seconds remaining`;
    }

    const minutes = Math.ceil(remainingSeconds / 60);
    return `About ${minutes} minute${minutes > 1 ? 's' : ''} remaining`;
  }, [store.status, store.progress, store.totalTasksExpected, store.tasksCreated.length]);

  // Start planning with project ID
  const startPlanning = useCallback(
    async (projectId: string) => {
      // Update local state immediately
      store.startPlanning(projectId);

      // Trigger backend planning process
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (window.nexusAPI?.planning?.start) {
        try {
          console.log('[usePlanningProgress] Starting planning for project:', projectId);
          const result = await window.nexusAPI.planning.start(projectId);
          console.log('[usePlanningProgress] Planning start result:', result);

          if (!result.success && result.error) {
            store.setError(result.error);
          }
        } catch (error) {
          console.error('[usePlanningProgress] Failed to start planning:', error);
          store.setError(error instanceof Error ? error.message : String(error));
        }
      }
    },
    [store]
  );

  // Retry planning after error
  const retry = useCallback(() => {
    if (store.projectId) {
      void startPlanning(store.projectId);
    }
  }, [store.projectId, startPlanning]);

  return {
    // State
    status: store.status,
    progress: store.progress,
    currentStep: store.currentStep,
    tasksCreated: store.tasksCreated,
    featuresIdentified: store.featuresIdentified,
    totalTasksExpected: store.totalTasksExpected,
    error: store.error,
    isComplete: store.status === 'complete',
    isError: store.status === 'error',
    isLoading: ['analyzing', 'decomposing', 'creating-tasks', 'validating'].includes(store.status),

    // Derived
    taskCount: store.tasksCreated.length,
    featureCount: store.featuresIdentified.length,
    estimatedTimeRemaining: estimatedTimeRemaining(),

    // Actions - wrap async to avoid no-misused-promises
    startPlanning: (projectId: string) => { void startPlanning(projectId); },
    retry,
    reset: store.reset,
  };
}

// ============================================================================
// Selector Hooks
// ============================================================================

/** Get just the planning status */
export const usePlanningStatus = () => usePlanningStore((s) => s.status);

/** Get just the progress percentage */
export const usePlanningProgressPercent = () => usePlanningStore((s) => s.progress);

/** Get the list of created tasks */
export const usePlanningTasks = () => usePlanningStore((s) => s.tasksCreated);

/** Check if planning is complete */
export const useIsPlanningComplete = () => usePlanningStore((s) => s.status === 'complete');

/** Check if planning has an error */
export const useIsPlanningError = () => usePlanningStore((s) => s.status === 'error');
