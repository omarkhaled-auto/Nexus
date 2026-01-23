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
  PlanningTaskCreatedPayload,
  PlanningCompletedPayload,
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
    // Check if nexusAPI is available (Electron context)
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!window.nexusAPI) {
      return;
    }

    // Note: The IPC event subscription would be handled here once the backend
    // implements the planning progress events. For now, the PlanningPage
    // includes a simulation mode for demo purposes.
    //
    // When backend is ready, we would subscribe to:
    // - planning:progress
    // - planning:task-created
    // - planning:completed
    // - planning:error
    //
    // The store actions (updateProgress, addTask, complete, setError) are ready
    // to receive these events.

    return () => {
      // Cleanup subscriptions when implemented
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
    (projectId: string) => {
      store.startPlanning(projectId);

      // Note: Backend planning process would be triggered here once implemented.
      // For now, the PlanningPage includes a simulation mode for demo purposes.
      // When backend is ready:
      // void window.nexusAPI?.planning?.start(projectId);
    },
    [store]
  );

  // Retry planning after error
  const retry = useCallback(() => {
    if (store.projectId) {
      startPlanning(store.projectId);
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

    // Actions
    startPlanning,
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
