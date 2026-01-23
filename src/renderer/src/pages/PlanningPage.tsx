/**
 * Planning Page
 *
 * Shows progress while tasks are being created after interview completion.
 * Displays real-time updates as the AI analyzes requirements and creates tasks.
 * Automatically navigates to Kanban when ALL tasks are ready.
 *
 * Phase 24: Planning Phase Screen implementation
 */

import { useEffect, useState, type ReactElement } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { AnimatedPage } from '@renderer/components/AnimatedPage';
import { usePlanningProgress, usePlanningStore } from '@renderer/hooks/usePlanningProgress';
import { cn } from '@renderer/lib/utils';
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ChevronRight,
  Clock,
  ListTodo,
  Layers,
  Loader2,
  ArrowRight,
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

interface LocationState {
  requirements?: Array<{
    id: string;
    summary: string;
    priority?: string;
  }>;
  projectId?: string;
}

// ============================================================================
// Sub-Components
// ============================================================================

/**
 * Progress bar component with animated fill
 */
function ProgressBar({ progress, className }: { progress: number; className?: string }): ReactElement {
  return (
    <div className={cn('h-2 bg-bg-hover rounded-full overflow-hidden', className)}>
      <div
        className="h-full bg-gradient-to-r from-accent-primary to-accent-secondary transition-all duration-500 ease-out"
        style={{ width: `${Math.min(progress, 100)}%` }}
      />
    </div>
  );
}

/**
 * Step indicator for planning phases
 */
function PlanningSteps({ currentStatus }: { currentStatus: string }): ReactElement {
  const steps = [
    { id: 'analyzing', label: 'Analyzing', icon: Sparkles },
    { id: 'decomposing', label: 'Decomposing', icon: Layers },
    { id: 'creating-tasks', label: 'Creating Tasks', icon: ListTodo },
    { id: 'validating', label: 'Validating', icon: CheckCircle2 },
  ];

  const currentIndex = steps.findIndex((s) => s.id === currentStatus);

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-4">
      {steps.map((step, index) => {
        const Icon = step.icon;
        const isActive = step.id === currentStatus;
        const isComplete = index < currentIndex;
        const isPending = index > currentIndex;

        return (
          <div key={step.id} className="flex items-center">
            <div
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-300',
                isActive && 'bg-accent-primary/20 border border-accent-primary/50',
                isComplete && 'bg-accent-success/20 border border-accent-success/50',
                isPending && 'bg-bg-card border border-border-default opacity-50'
              )}
            >
              <Icon
                className={cn(
                  'w-4 h-4',
                  isActive && 'text-accent-primary animate-pulse',
                  isComplete && 'text-accent-success',
                  isPending && 'text-text-tertiary'
                )}
              />
              <span
                className={cn(
                  'text-sm font-medium hidden sm:inline',
                  isActive && 'text-accent-primary',
                  isComplete && 'text-accent-success',
                  isPending && 'text-text-tertiary'
                )}
              >
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <ChevronRight
                className={cn(
                  'w-4 h-4 mx-1',
                  index < currentIndex ? 'text-accent-success' : 'text-text-tertiary'
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Task preview card in the task list
 */
function TaskPreviewCard({
  task,
  index,
}: {
  task: { id: string; title: string; priority: string; estimatedMinutes: number };
  index: number;
}): ReactElement {
  const priorityColors: Record<string, string> = {
    critical: 'bg-red-500/20 text-red-400 border-red-500/30',
    high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    normal: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    low: 'bg-green-500/20 text-green-400 border-green-500/30',
  };

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 bg-bg-card rounded-lg border border-border-default',
        'animate-in slide-in-from-left duration-300'
      )}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-accent-primary/20 flex items-center justify-center">
        <ListTodo className="w-4 h-4 text-accent-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary truncate">{task.title}</p>
        <div className="flex items-center gap-2 mt-1">
          <span
            className={cn(
              'text-xs px-2 py-0.5 rounded border',
              priorityColors[task.priority] ?? priorityColors.normal
            )}
          >
            {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
          </span>
          <span className="text-xs text-text-tertiary flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {task.estimatedMinutes}m
          </span>
        </div>
      </div>
      <CheckCircle2 className="w-5 h-5 text-accent-success flex-shrink-0" />
    </div>
  );
}

/**
 * Error state component
 */
function ErrorState({
  error,
  onRetry,
}: {
  error: string;
  onRetry: () => void;
}): ReactElement {
  return (
    <div className="flex flex-col items-center justify-center gap-6 p-8">
      <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
        <AlertCircle className="w-8 h-8 text-red-500" />
      </div>
      <div className="text-center">
        <h2 className="text-xl font-semibold text-text-primary mb-2">Planning Failed</h2>
        <p className="text-text-secondary max-w-md">{error}</p>
      </div>
      <button
        onClick={onRetry}
        className={cn(
          'flex items-center gap-2 px-6 py-3 rounded-lg',
          'bg-accent-primary text-white font-medium',
          'hover:bg-accent-primary/90 transition-colors'
        )}
      >
        <RefreshCw className="w-4 h-4" />
        Try Again
      </button>
    </div>
  );
}

/**
 * Complete state component with navigation
 */
function CompleteState({
  taskCount,
  onProceed,
}: {
  taskCount: number;
  onProceed: () => void;
}): ReactElement {
  return (
    <div className="flex flex-col items-center justify-center gap-6 p-8 animate-in fade-in duration-500">
      <div className="w-16 h-16 rounded-full bg-accent-success/20 flex items-center justify-center">
        <CheckCircle2 className="w-8 h-8 text-accent-success" />
      </div>
      <div className="text-center">
        <h2 className="text-xl font-semibold text-text-primary mb-2">Planning Complete!</h2>
        <p className="text-text-secondary">
          Created {taskCount} task{taskCount !== 1 ? 's' : ''} for your project.
        </p>
      </div>
      <button
        onClick={onProceed}
        className={cn(
          'flex items-center gap-2 px-6 py-3 rounded-lg',
          'bg-accent-primary text-white font-medium',
          'hover:bg-accent-primary/90 hover:shadow-glow-primary transition-all'
        )}
      >
        View Kanban Board
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * Planning Page Component
 *
 * Displays progress during the task creation phase after interview completion.
 * Shows real-time updates as tasks are created.
 * Auto-navigates to Kanban when complete.
 */
export default function PlanningPage(): ReactElement {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as LocationState | null;

  const {
    status,
    progress,
    currentStep,
    tasksCreated,
    taskCount,
    featureCount,
    estimatedTimeRemaining,
    error,
    isComplete,
    isError,
    isLoading,
    startPlanning,
    retry,
  } = usePlanningProgress();

  const [autoNavigateCountdown, setAutoNavigateCountdown] = useState<number | null>(null);

  // Start planning on mount if we have requirements
  useEffect(() => {
    const requirements = locationState?.requirements;
    const projectId = locationState?.projectId ?? 'current';

    if (status === 'idle' && requirements && requirements.length > 0) {
      // Start the planning process
      startPlanning(projectId);

      // DEMO: Simulate planning progress for now (remove when backend is connected)
      simulatePlanningProgress(requirements);
    }
  }, [locationState, status, startPlanning]);

  // Auto-navigate countdown when complete
  useEffect(() => {
    if (!isComplete) {
      return;
    }

    setAutoNavigateCountdown(5);

    const interval = setInterval(() => {
      setAutoNavigateCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          navigate('/evolution');
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isComplete, navigate]);

  // Handle manual proceed
  const handleProceed = () => {
    navigate('/evolution');
  };

  // Handle retry
  const handleRetry = () => {
    retry();
    // Re-trigger simulation if needed
    const requirements = locationState?.requirements;
    if (requirements) {
      simulatePlanningProgress(requirements);
    }
  };

  // DEMO: Simulate planning progress (remove when backend is connected)
  const simulatePlanningProgress = (
    requirements: Array<{ id: string; summary: string; priority?: string }>
  ) => {
    const store = usePlanningStore.getState();

    // Phase 1: Analyzing (0-25%)
    setTimeout(() => {
      store.updateProgress({
        projectId: 'current',
        status: 'analyzing',
        progress: 15,
        currentStep: 'Analyzing requirements...',
        tasksCreated: 0,
        totalExpected: requirements.length * 3,
      });
    }, 500);

    // Phase 2: Decomposing (25-50%)
    setTimeout(() => {
      store.updateProgress({
        projectId: 'current',
        status: 'decomposing',
        progress: 35,
        currentStep: 'Breaking down into features...',
        tasksCreated: 0,
        totalExpected: requirements.length * 3,
      });

      // Add features
      requirements.forEach((req, index) => {
        setTimeout(() => {
          store.addFeature({
            id: `feature-${index + 1}`,
            name: req.summary.slice(0, 50),
            taskCount: 3,
            status: 'identified',
          });
        }, index * 300);
      });
    }, 1500);

    // Phase 3: Creating tasks (50-90%)
    setTimeout(() => {
      store.setStatus('creating-tasks');

      const totalTasks = requirements.length * 3;
      let taskIndex = 0;

      requirements.forEach((req, reqIndex) => {
        const taskTypes = ['Setup', 'Implementation', 'Testing'];
        taskTypes.forEach((type, typeIndex) => {
          const currentIndex = taskIndex++;
          setTimeout(
            () => {
              store.addTask({
                id: `task-${currentIndex + 1}`,
                title: `${type}: ${req.summary.slice(0, 40)}`,
                featureId: `feature-${reqIndex + 1}`,
                priority: req.priority === 'must' ? 'critical' : req.priority === 'should' ? 'high' : 'normal',
                complexity: typeIndex === 1 ? 'moderate' : 'simple',
                estimatedMinutes: typeIndex === 1 ? 30 : 15,
                dependsOn: typeIndex > 0 ? [`task-${currentIndex}`] : [],
                status: 'created',
              });

              store.updateProgress({
                projectId: 'current',
                status: 'creating-tasks',
                progress: 50 + ((currentIndex + 1) / totalTasks) * 40,
                currentStep: `Creating task ${currentIndex + 1} of ${totalTasks}...`,
                tasksCreated: currentIndex + 1,
                totalExpected: totalTasks,
              });
            },
            currentIndex * 400
          );
        });
      });
    }, 3000);

    // Phase 4: Validating and Complete (90-100%)
    const totalTime = 3000 + requirements.length * 3 * 400 + 1000;
    setTimeout(() => {
      store.updateProgress({
        projectId: 'current',
        status: 'validating',
        progress: 95,
        currentStep: 'Validating dependencies...',
        tasksCreated: requirements.length * 3,
        totalExpected: requirements.length * 3,
      });
    }, totalTime);

    setTimeout(() => {
      store.complete();
    }, totalTime + 1500);
  };

  return (
    <AnimatedPage className="min-h-full bg-bg-dark">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <header className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent-primary/10 border border-accent-primary/30 mb-6">
            <Sparkles className="w-4 h-4 text-accent-primary" />
            <span className="text-sm font-medium text-accent-primary">Planning Phase</span>
          </div>
          <h1 className="text-3xl font-bold text-text-primary mb-3">Planning Your Project</h1>
          <p className="text-text-secondary max-w-lg mx-auto">
            Our AI is analyzing your requirements and creating a structured plan with tasks,
            dependencies, and estimates.
          </p>
        </header>

        {/* Error State */}
        {isError && error && <ErrorState error={error} onRetry={handleRetry} />}

        {/* Complete State */}
        {isComplete && !isError && (
          <div>
            <CompleteState taskCount={taskCount} onProceed={handleProceed} />
            {autoNavigateCountdown !== null && (
              <p className="text-center text-text-tertiary text-sm mt-4">
                Redirecting to Kanban in {autoNavigateCountdown}s...
              </p>
            )}
          </div>
        )}

        {/* Loading/Progress State */}
        {isLoading && !isError && (
          <div className="space-y-8">
            {/* Progress Steps */}
            <PlanningSteps currentStatus={status} />

            {/* Main Progress Section */}
            <div className="bg-bg-card rounded-xl border border-border-default p-6">
              {/* Current Step */}
              <div className="flex items-center gap-3 mb-4">
                <Loader2 className="w-5 h-5 text-accent-primary animate-spin" />
                <span className="text-text-primary font-medium">{currentStep}</span>
              </div>

              {/* Progress Bar */}
              <ProgressBar progress={progress} className="mb-4" />

              {/* Stats Row */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">{Math.round(progress)}% complete</span>
                <div className="flex items-center gap-4">
                  <span className="text-text-tertiary">
                    {featureCount} feature{featureCount !== 1 ? 's' : ''}
                  </span>
                  <span className="text-text-tertiary">
                    {taskCount} task{taskCount !== 1 ? 's' : ''}
                  </span>
                  {estimatedTimeRemaining && (
                    <span className="text-text-tertiary flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {estimatedTimeRemaining}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Task List */}
            {tasksCreated.length > 0 && (
              <div className="bg-bg-card rounded-xl border border-border-default p-6">
                <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                  <ListTodo className="w-5 h-5 text-accent-primary" />
                  Tasks Created ({taskCount})
                </h3>
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                  {tasksCreated.map((task, index) => (
                    <TaskPreviewCard key={task.id} task={task} index={index} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Idle State (no requirements) */}
        {status === 'idle' && (!locationState?.requirements || locationState.requirements.length === 0) && (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-bg-hover mx-auto mb-6 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-text-tertiary" />
            </div>
            <h2 className="text-xl font-semibold text-text-primary mb-2">No Requirements Found</h2>
            <p className="text-text-secondary mb-6">
              Please complete the interview first to define your project requirements.
            </p>
            <button
              onClick={() => navigate('/genesis')}
              className={cn(
                'px-6 py-3 rounded-lg font-medium',
                'bg-accent-primary text-white',
                'hover:bg-accent-primary/90 transition-colors'
              )}
            >
              Start Interview
            </button>
          </div>
        )}
      </div>
    </AnimatedPage>
  );
}
