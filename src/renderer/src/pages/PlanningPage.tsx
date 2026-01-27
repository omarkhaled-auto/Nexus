/**
 * Planning Page
 *
 * Shows progress while tasks are being created after interview completion.
 * Displays real-time updates as the AI analyzes requirements and creates tasks.
 * Automatically navigates to Kanban when ALL tasks are ready.
 *
 * Design: Linear/Raycast-inspired with large animated progress ring and pipeline visualization.
 */

import { useEffect, useState, type ReactElement } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { AnimatedPage } from '@renderer/components/AnimatedPage';
import { usePlanningProgress } from '@renderer/hooks/usePlanningProgress';
import { cn } from '@renderer/lib/utils';
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Clock,
  ListTodo,
  Layers,
  Loader2,
  ArrowRight,
  Brain,
  FileCode,
  GitBranch,
  Zap,
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
 * Large animated circular progress ring
 */
function ProgressRing({ progress }: { progress: number }): ReactElement {
  const radius = 120;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative w-72 h-72">
      {/* Glow effect */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[#7C3AED]/20 to-[#6366F1]/20 blur-2xl animate-pulse" />

      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 280 280">
        {/* Background gradient definition */}
        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7C3AED" />
            <stop offset="50%" stopColor="#6366F1" />
            <stop offset="100%" stopColor="#8B5CF6" />
          </linearGradient>
        </defs>

        {/* Background circle */}
        <circle
          cx="140"
          cy="140"
          r={radius}
          fill="none"
          stroke="#21262D"
          strokeWidth="16"
        />

        {/* Progress circle */}
        <circle
          cx="140"
          cy="140"
          r={radius}
          fill="none"
          stroke="url(#progressGradient)"
          strokeWidth="16"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-700 ease-out"
          style={{
            filter: 'drop-shadow(0 0 20px rgba(124, 58, 237, 0.5))',
          }}
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-6xl font-bold text-[#F0F6FC] tabular-nums">
          {Math.round(progress)}
        </span>
        <span className="text-xl text-[#8B949E] -mt-1">percent</span>
      </div>
    </div>
  );
}

/**
 * Pipeline step indicator for planning phases
 */
function PipelineSteps({ currentStatus }: { currentStatus: string }): ReactElement {
  const steps = [
    { id: 'analyzing', label: 'Analyzing', icon: Brain, description: 'Understanding requirements' },
    { id: 'decomposing', label: 'Decomposing', icon: Layers, description: 'Breaking down features' },
    { id: 'creating-tasks', label: 'Creating', icon: FileCode, description: 'Generating tasks' },
    { id: 'validating', label: 'Validating', icon: GitBranch, description: 'Checking dependencies' },
  ];

  const currentIndex = steps.findIndex((s) => s.id === currentStatus);

  return (
    <div className="flex items-center justify-center gap-3" data-testid="planning-steps">
      {steps.map((step, index) => {
        const Icon = step.icon;
        const isActive = step.id === currentStatus;
        const isComplete = index < currentIndex;
        const isPending = index > currentIndex;

        return (
          <div key={step.id} className="flex items-center">
            <div
              className={cn(
                'relative flex flex-col items-center',
                'transition-all duration-500'
              )}
            >
              {/* Step circle */}
              <div
                className={cn(
                  'w-12 h-12 rounded-xl flex items-center justify-center',
                  'transition-all duration-300',
                  isActive && 'bg-gradient-to-br from-[#7C3AED] to-[#6366F1] text-white shadow-lg shadow-[#7C3AED]/30',
                  isComplete && 'bg-[#10B981] text-white',
                  isPending && 'bg-[#21262D] text-[#6E7681]'
                )}
              >
                {isComplete ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : isActive ? (
                  <Icon className="w-5 h-5 animate-pulse" />
                ) : (
                  <Icon className="w-5 h-5" />
                )}
              </div>

              {/* Label */}
              <span
                className={cn(
                  'mt-2 text-xs font-medium',
                  isActive && 'text-[#7C3AED]',
                  isComplete && 'text-[#10B981]',
                  isPending && 'text-[#6E7681]'
                )}
              >
                {step.label}
              </span>

              {/* Description on active */}
              {isActive && (
                <span className="text-[10px] text-[#8B949E] mt-0.5 animate-fade-in-up">
                  {step.description}
                </span>
              )}
            </div>

            {/* Connector */}
            {index < steps.length - 1 && (
              <div className="flex items-center mx-4">
                <div
                  className={cn(
                    'w-12 h-1 rounded-full transition-all duration-500',
                    index < currentIndex ? 'bg-[#10B981]' : 'bg-[#21262D]'
                  )}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Task preview card with staggered animation
 */
function TaskPreviewCard({
  task,
  index,
}: {
  task: { id: string; title: string; priority: string; estimatedMinutes: number };
  index: number;
}): ReactElement {
  const priorityConfig: Record<string, { bg: string; text: string; border: string }> = {
    critical: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-l-red-500' },
    high: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-l-orange-500' },
    normal: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-l-amber-500' },
    low: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-l-emerald-500' },
  };

  const config = priorityConfig[task.priority] ?? priorityConfig.normal;

  return (
    <div
      className={cn(
        'flex items-center gap-4 p-4 rounded-xl',
        'bg-[#161B22] border border-[#30363D]',
        'border-l-4',
        config.border,
        'animate-fade-in-up hover:bg-[#21262D] transition-colors'
      )}
      style={{ animationDelay: `${index * 80}ms` }}
      data-testid={`task-preview-${task.id}`}
    >
      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[#7C3AED]/10 flex items-center justify-center">
        <ListTodo className="w-5 h-5 text-[#7C3AED]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#F0F6FC] truncate">{task.title}</p>
        <div className="flex items-center gap-3 mt-1">
          <span
            className={cn(
              'text-xs px-2 py-0.5 rounded-md',
              config.bg,
              config.text
            )}
          >
            {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
          </span>
          <span className="text-xs text-[#6E7681] flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {task.estimatedMinutes}m
          </span>
        </div>
      </div>
      <CheckCircle2 className="w-5 h-5 text-[#10B981] flex-shrink-0" />
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
    <div className="flex flex-col items-center justify-center gap-6 p-8 animate-fade-in-up" data-testid="error-state">
      <div className="w-20 h-20 rounded-2xl bg-red-500/10 flex items-center justify-center">
        <AlertCircle className="w-10 h-10 text-red-500" />
      </div>
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-[#F0F6FC] mb-2">Planning Failed</h2>
        <p className="text-[#8B949E] max-w-md">{error}</p>
      </div>
      <button
        onClick={onRetry}
        data-testid="retry-button"
        className={cn(
          'flex items-center gap-2 px-6 py-3 rounded-xl',
          'bg-gradient-to-r from-[#7C3AED] to-[#6366F1] text-white font-medium',
          'hover:shadow-lg hover:shadow-[#7C3AED]/25 transition-all'
        )}
      >
        <RefreshCw className="w-4 h-4" />
        Try Again
      </button>
    </div>
  );
}

/**
 * Complete state component with navigation and countdown
 */
function CompleteState({
  taskCount,
  onProceed,
  countdown,
}: {
  taskCount: number;
  onProceed: () => void;
  countdown: number | null;
}): ReactElement {
  return (
    <div className="flex flex-col items-center justify-center gap-8 p-8 animate-fade-in-up" data-testid="complete-state">
      {/* Success icon with glow */}
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-[#10B981]/30 blur-2xl animate-pulse" />
        <div className="relative w-24 h-24 rounded-2xl bg-[#10B981]/20 flex items-center justify-center">
          <CheckCircle2 className="w-12 h-12 text-[#10B981]" />
        </div>
      </div>

      <div className="text-center">
        <h2 className="text-3xl font-bold text-[#F0F6FC] mb-2">Planning Complete!</h2>
        <p className="text-[#8B949E] text-lg">
          Created <span className="text-[#F0F6FC] font-semibold">{taskCount}</span> task{taskCount !== 1 ? 's' : ''} for your project
        </p>
      </div>

      {/* Countdown indicator */}
      {countdown !== null && (
        <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-[#21262D] border border-[#30363D]">
          <Loader2 className="w-4 h-4 text-[#7C3AED] animate-spin" />
          <span className="text-sm text-[#8B949E]">
            Redirecting in <span className="text-[#F0F6FC] font-medium tabular-nums">{countdown}s</span>
          </span>
        </div>
      )}

      <button
        onClick={onProceed}
        data-testid="proceed-button"
        className={cn(
          'flex items-center gap-2 px-8 py-4 rounded-xl',
          'bg-gradient-to-r from-[#7C3AED] to-[#6366F1] text-white font-medium text-lg',
          'hover:shadow-lg hover:shadow-[#7C3AED]/25 transition-all',
          'group'
        )}
      >
        View Kanban Board
        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
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
      console.log('[PlanningPage] Starting planning for project:', projectId, 'with', requirements.length, 'requirements');
      startPlanning(projectId);
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
          void navigate('/evolution');
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => { clearInterval(interval); };
  }, [isComplete, navigate]);

  // Handle manual proceed
  const handleProceed = (): void => {
    void navigate('/evolution');
  };

  // Handle retry
  const handleRetry = () => {
    retry();
  };

  return (
    <AnimatedPage className="min-h-full bg-[#0D1117] relative overflow-hidden" data-testid="planning-page">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-mesh opacity-20 pointer-events-none" />
      <div className="absolute inset-0 bg-grid-pattern opacity-30 pointer-events-none" />

      {/* Animated orbs */}
      <div className="absolute top-20 left-1/4 w-96 h-96 bg-[#7C3AED]/10 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-[#6366F1]/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <header className="text-center mb-12 animate-fade-in-up">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#7C3AED]/10 border border-[#7C3AED]/30 mb-6">
            <Zap className="w-4 h-4 text-[#7C3AED]" />
            <span className="text-sm font-medium text-[#7C3AED]">Planning Phase</span>
          </div>
          <h1 className="text-4xl font-bold text-[#F0F6FC] mb-3">Planning Your Project</h1>
          <p className="text-[#8B949E] max-w-lg mx-auto text-lg">
            Our AI is analyzing your requirements and creating a structured plan with tasks,
            dependencies, and estimates.
          </p>
        </header>

        {/* Error State */}
        {isError && error && <ErrorState error={error} onRetry={handleRetry} />}

        {/* Complete State */}
        {isComplete && !isError && (
          <CompleteState
            taskCount={taskCount}
            onProceed={handleProceed}
            countdown={autoNavigateCountdown}
          />
        )}

        {/* Loading/Progress State */}
        {isLoading && !isError && (
          <div className="space-y-12">
            {/* Progress Ring */}
            <div className="flex flex-col items-center justify-center">
              <ProgressRing progress={progress} />

              {/* Current step label */}
              <div className="mt-8 flex items-center gap-3 px-4 py-2 rounded-full bg-[#21262D] border border-[#30363D]">
                <Loader2 className="w-4 h-4 text-[#7C3AED] animate-spin" />
                <span className="text-sm text-[#F0F6FC]" data-testid="current-step">{currentStep}</span>
              </div>
            </div>

            {/* Pipeline Steps */}
            <div className="animate-fade-in-up" style={{ animationDelay: '200ms' }}>
              <PipelineSteps currentStatus={status} />
            </div>

            {/* Stats Row */}
            <div
              className="flex items-center justify-center gap-8 animate-fade-in-up"
              style={{ animationDelay: '400ms' }}
              data-testid="progress-stats"
            >
              <div className="flex items-center gap-2 text-sm">
                <Layers className="w-4 h-4 text-[#7C3AED]" />
                <span className="text-[#8B949E]">
                  <span className="text-[#F0F6FC] font-medium">{featureCount}</span> feature{featureCount !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="w-px h-4 bg-[#30363D]" />
              <div className="flex items-center gap-2 text-sm">
                <ListTodo className="w-4 h-4 text-[#6366F1]" />
                <span className="text-[#8B949E]">
                  <span className="text-[#F0F6FC] font-medium">{taskCount}</span> task{taskCount !== 1 ? 's' : ''}
                </span>
              </div>
              {estimatedTimeRemaining && (
                <>
                  <div className="w-px h-4 bg-[#30363D]" />
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-[#8B949E]" />
                    <span className="text-[#8B949E]">{estimatedTimeRemaining}</span>
                  </div>
                </>
              )}
            </div>

            {/* Task List */}
            {tasksCreated.length > 0 && (
              <div
                className="bg-[#161B22]/50 backdrop-blur-sm rounded-2xl border border-[#30363D] p-6 animate-fade-in-up"
                style={{ animationDelay: '600ms' }}
                data-testid="task-list"
              >
                <h3 className="text-lg font-semibold text-[#F0F6FC] mb-4 flex items-center gap-2">
                  <ListTodo className="w-5 h-5 text-[#7C3AED]" />
                  Tasks Created
                  <span className="ml-auto text-sm font-normal text-[#8B949E]">{taskCount} total</span>
                </h3>
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
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
          <div className="text-center py-12 animate-fade-in-up" data-testid="idle-state">
            <div className="w-20 h-20 rounded-2xl bg-[#21262D] mx-auto mb-6 flex items-center justify-center">
              <AlertCircle className="w-10 h-10 text-[#6E7681]" />
            </div>
            <h2 className="text-2xl font-semibold text-[#F0F6FC] mb-2">No Requirements Found</h2>
            <p className="text-[#8B949E] mb-8 max-w-md mx-auto">
              Please complete the interview first to define your project requirements.
            </p>
            <button
              onClick={() => { void navigate('/genesis'); }}
              data-testid="start-interview-button"
              className={cn(
                'px-6 py-3 rounded-xl font-medium',
                'bg-gradient-to-r from-[#7C3AED] to-[#6366F1] text-white',
                'hover:shadow-lg hover:shadow-[#7C3AED]/25 transition-all'
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
