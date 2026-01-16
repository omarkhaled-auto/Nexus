import { type ReactElement, useCallback } from 'react';
import type { InterviewStage } from '@renderer/types/interview';
import { useInterviewStore, useInterviewStage } from '@renderer/stores/interviewStore';

// Ordered stages array
const STAGES: InterviewStage[] = [
  'welcome',
  'project_overview',
  'technical_requirements',
  'features',
  'constraints',
  'review',
  'complete',
];

// Short labels for each stage
const STAGE_LABELS: Record<InterviewStage, string> = {
  welcome: 'Start',
  project_overview: 'Overview',
  technical_requirements: 'Tech',
  features: 'Features',
  constraints: 'Limits',
  review: 'Review',
  complete: 'Done',
};

interface StageProgressProps {
  /** Current interview stage */
  currentStage?: InterviewStage;
  /** Allow clicking to navigate back to previous stages */
  allowBackNavigation?: boolean;
  /** Optional callback when stage is clicked */
  onStageClick?: (stage: InterviewStage) => void;
}

/**
 * StageProgress - Visual 7-stage horizontal progress indicator.
 *
 * Features:
 * - 7 horizontal dots representing interview stages
 * - Completed stages: filled violet dot
 * - Current stage: filled violet dot with ring/glow
 * - Future stages: muted empty dot
 * - Clickable stages to jump back (if allowed)
 * - Smooth transition animations
 */
export function StageProgress({
  currentStage: propStage,
  allowBackNavigation = true,
  onStageClick,
}: StageProgressProps): ReactElement {
  const storeStage = useInterviewStage();
  const setStage = useInterviewStore((s) => s.setStage);

  // Use prop stage if provided, otherwise use store
  const currentStage = propStage ?? storeStage;
  const currentIndex = STAGES.indexOf(currentStage);

  const handleStageClick = useCallback(
    (stage: InterviewStage, index: number) => {
      // Only allow navigating back to completed stages
      if (!allowBackNavigation || index >= currentIndex) return;

      if (onStageClick) {
        onStageClick(stage);
      } else {
        setStage(stage);
      }
    },
    [allowBackNavigation, currentIndex, onStageClick, setStage]
  );

  // Calculate progress percentage for the connecting line
  const progressPercent = (currentIndex / (STAGES.length - 1)) * 100;

  return (
    <div className="flex flex-col gap-1.5 w-full max-w-md mx-auto">
      {/* Progress bar with dots */}
      <div className="relative flex items-center justify-between">
        {/* Background line */}
        <div className="absolute left-0 right-0 h-0.5 bg-border rounded-full" />

        {/* Progress line */}
        <div
          className="absolute left-0 h-0.5 bg-violet-500 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progressPercent}%` }}
        />

        {/* Stage dots */}
        {STAGES.map((stage, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const _isFuture = index > currentIndex;
          const isClickable = allowBackNavigation && isCompleted;

          return (
            <button
              key={stage}
              type="button"
              onClick={() => { handleStageClick(stage, index); }}
              disabled={!isClickable}
              className={`
                relative z-10 flex items-center justify-center
                w-3 h-3 rounded-full
                transition-all duration-300 ease-out
                ${isClickable ? 'cursor-pointer hover:scale-125' : 'cursor-default'}
                ${
                  isCurrent
                    ? 'bg-violet-500 ring-4 ring-violet-500/30 shadow-lg shadow-violet-500/40'
                    : isCompleted
                      ? 'bg-violet-500 hover:ring-2 hover:ring-violet-500/30'
                      : 'bg-muted-foreground/30'
                }
              `}
              title={isClickable ? `Go back to ${STAGE_LABELS[stage]}` : STAGE_LABELS[stage]}
              aria-label={`${STAGE_LABELS[stage]} stage${isCurrent ? ' (current)' : isCompleted ? ' (completed)' : ''}`}
            >
              {/* Inner glow for current stage */}
              {isCurrent && (
                <span className="absolute inset-0 rounded-full bg-violet-400 animate-pulse opacity-50" />
              )}
            </button>
          );
        })}
      </div>

      {/* Stage labels */}
      <div className="flex justify-between text-[10px] text-muted-foreground">
        {STAGES.map((stage, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;

          return (
            <span
              key={stage}
              className={`
                transition-colors duration-300
                ${isCurrent ? 'text-violet-500 font-medium' : isCompleted ? 'text-foreground/70' : ''}
              `}
            >
              {STAGE_LABELS[stage]}
            </span>
          );
        })}
      </div>
    </div>
  );
}
