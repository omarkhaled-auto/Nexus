/**
 * QAStatusPanel Component
 *
 * Displays the status of QA pipeline steps: Build, Lint, Test, Review.
 * Shows step-by-step progress with icons, status indicators, and optional output.
 *
 * Features:
 * - Glassmorphism design
 * - Step-specific color coding
 * - Animated status indicators
 * - Progress tracking with iteration counter
 *
 * @example
 * // Basic usage
 * <QAStatusPanel steps={qaSteps} iteration={3} maxIterations={50} />
 *
 * @example
 * // With log viewer callback
 * <QAStatusPanel
 *   steps={qaSteps}
 *   iteration={3}
 *   maxIterations={50}
 *   onViewLogs={(type) => openLogs(type)}
 * />
 */

import React from 'react'
import {
  Hammer,
  FileSearch,
  TestTube2,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  MinusCircle,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import { IterationCounter } from './IterationCounter'

// =============================================================================
// TYPES
// =============================================================================

export type QAStepType = 'build' | 'lint' | 'test' | 'review'
export type QAStepStatus = 'pending' | 'running' | 'success' | 'error' | 'skipped'

export interface QAStep {
  /** Step type */
  type: QAStepType
  /** Step status */
  status: QAStepStatus
  /** Duration in ms */
  duration?: number
  /** Output summary */
  output?: string
  /** Error message */
  error?: string
  /** Test counts (for test step) */
  testCounts?: {
    passed: number
    failed: number
    skipped: number
  }
}

export interface QAStatusPanelProps {
  /** QA steps */
  steps: QAStep[]
  /** Current iteration */
  iteration: number
  /** Maximum iterations */
  maxIterations: number
  /** View logs callback */
  onViewLogs?: (type: QAStepType) => void
  /** Orientation */
  orientation?: 'horizontal' | 'vertical'
  /** Additional className */
  className?: string
  /** Test ID for Playwright */
  'data-testid'?: string
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** Step configuration with icons, labels, and colors */
const STEP_CONFIG: Record<QAStepType, { icon: typeof Hammer; label: string; color: string; gradient: string }> = {
  build: {
    icon: Hammer,
    label: 'Build',
    color: '#60A5FA',
    gradient: 'from-[#60A5FA] to-[#3B82F6]'
  },
  lint: {
    icon: FileSearch,
    label: 'Lint',
    color: '#A78BFA',
    gradient: 'from-[#A78BFA] to-[#8B5CF6]'
  },
  test: {
    icon: TestTube2,
    label: 'Test',
    color: '#34D399',
    gradient: 'from-[#34D399] to-[#10B981]'
  },
  review: {
    icon: Eye,
    label: 'Review',
    color: '#FBBF24',
    gradient: 'from-[#FBBF24] to-[#F59E0B]'
  },
}

/** Default step order */
const STEP_ORDER: QAStepType[] = ['build', 'lint', 'test', 'review']

// =============================================================================
// HELPERS
// =============================================================================

/** Format duration in ms */
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  return `${minutes}m ${seconds}s`
}

/** Get status icon */
function StatusIcon({ status }: { status: QAStepStatus }) {
  switch (status) {
    case 'success':
      return <CheckCircle2 size={14} className="text-[#3FB950]" />
    case 'error':
      return <XCircle size={14} className="text-[#F85149]" />
    case 'running':
      return <Loader2 size={14} className="text-[#60A5FA] animate-spin" />
    case 'skipped':
      return <MinusCircle size={14} className="text-[#6E7681]" />
    case 'pending':
    default:
      return <Clock size={14} className="text-[#6E7681]" />
  }
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface StepItemProps {
  step: QAStep
  isLast: boolean
  orientation: 'horizontal' | 'vertical'
  onViewLogs?: () => void
}

function StepItem({ step, isLast, orientation, onViewLogs }: StepItemProps) {
  const config = STEP_CONFIG[step.type]
  const Icon = config.icon

  const isInteractive = !!onViewLogs && (step.status === 'success' || step.status === 'error')

  return (
    <div
      className={cn(
        'flex items-center',
        orientation === 'horizontal' ? 'flex-col gap-2' : 'flex-row gap-3'
      )}
    >
      {/* Step indicator */}
      <button
        onClick={onViewLogs}
        disabled={!isInteractive}
        data-testid={`qa-step-${step.type}`}
        className={cn(
          'relative flex items-center justify-center',
          'w-12 h-12 rounded-xl',
          'transition-all duration-300',
          'border-2',

          // Status-based styling
          step.status === 'pending' && 'border-[#30363D] bg-[#21262D]/50',
          step.status === 'running' && 'border-[#60A5FA]/50 bg-[#60A5FA]/10',
          step.status === 'success' && 'border-[#3FB950]/50 bg-[#3FB950]/10',
          step.status === 'error' && 'border-[#F85149]/50 bg-[#F85149]/10',
          step.status === 'skipped' && 'border-[#30363D] bg-[#21262D]/30',

          // Interactive states
          isInteractive && [
            'cursor-pointer',
            'hover:scale-105',
            'hover:shadow-lg',
            'focus:outline-none focus:ring-2 focus:ring-[#7C3AED] focus:ring-offset-2 focus:ring-offset-[#161B22]',
          ],
          !isInteractive && 'cursor-default'
        )}
        style={{
          boxShadow: step.status === 'running'
            ? `0 0 20px ${config.color}30`
            : step.status === 'success'
              ? '0 0 15px rgba(63, 185, 80, 0.2)'
              : step.status === 'error'
                ? '0 0 15px rgba(248, 81, 73, 0.2)'
                : undefined
        }}
        title={isInteractive ? `View ${config.label} logs` : undefined}
      >
        {step.status === 'running' ? (
          <Loader2 size={20} className="animate-spin" style={{ color: config.color }} />
        ) : (
          <Icon
            size={20}
            style={{
              color:
                step.status === 'skipped' || step.status === 'pending'
                  ? '#6E7681'
                  : config.color,
            }}
          />
        )}

        {/* Status badge */}
        <div className="absolute -top-1 -right-1">
          <StatusIcon status={step.status} />
        </div>
      </button>

      {/* Label and details */}
      <div
        className={cn(
          'flex flex-col',
          orientation === 'horizontal' ? 'items-center' : 'items-start'
        )}
      >
        <span
          className={cn(
            'text-sm font-medium',
            step.status === 'pending' || step.status === 'skipped'
              ? 'text-[#6E7681]'
              : 'text-[#F0F6FC]'
          )}
        >
          {config.label}
        </span>

        {/* Duration or status text */}
        <span className="text-xs text-[#6E7681]">
          {step.status === 'running' && 'Running...'}
          {step.status === 'pending' && 'Pending'}
          {step.status === 'skipped' && 'Skipped'}
          {(step.status === 'success' || step.status === 'error') &&
            step.duration &&
            formatDuration(step.duration)}
          {step.status === 'error' && !step.duration && 'Failed'}
        </span>

        {/* Test counts (for test step) */}
        {step.type === 'test' &&
          step.testCounts &&
          (step.status === 'success' || step.status === 'error') && (
            <span className="text-xs mt-0.5 tabular-nums">
              <span className="text-[#3FB950]">{step.testCounts.passed}</span>
              <span className="text-[#484F58]"> / </span>
              {step.testCounts.failed > 0 && (
                <>
                  <span className="text-[#F85149]">{step.testCounts.failed}</span>
                  <span className="text-[#484F58]"> / </span>
                </>
              )}
              <span className="text-[#6E7681]">{step.testCounts.skipped} skip</span>
            </span>
          )}
      </div>

      {/* Connector line (not for last item) */}
      {!isLast && (
        <div
          className={cn(
            orientation === 'horizontal' ? 'hidden sm:block w-8 h-0.5' : 'hidden',
            'bg-[#30363D] mx-2'
          )}
        />
      )}
    </div>
  )
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const QAStatusPanel = React.forwardRef<HTMLDivElement, QAStatusPanelProps>(
  (
    {
      steps,
      iteration,
      maxIterations,
      onViewLogs,
      orientation = 'horizontal',
      className,
      'data-testid': testId,
    },
    ref
  ) => {
    // Sort steps by order, fill in missing steps as pending
    const orderedSteps = STEP_ORDER.map((type) => {
      const existingStep = steps.find((s) => s.type === type)
      return existingStep || { type, status: 'pending' as QAStepStatus }
    })

    // Calculate overall status
    const hasError = steps.some((s) => s.status === 'error')
    const isRunning = steps.some((s) => s.status === 'running')
    const allSuccess = steps.every((s) => s.status === 'success' || s.status === 'skipped')

    return (
      <div
        ref={ref}
        data-testid={testId ?? 'qa-status-panel'}
        className={cn(
          'rounded-xl border overflow-hidden',
          'bg-[#161B22]/60 backdrop-blur-sm',
          'border-[#30363D]',
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#30363D] bg-[#161B22]/40">
          <div className="flex items-center gap-2">
            <span className="font-medium text-[#F0F6FC]">QA Pipeline</span>

            {/* Overall status badge */}
            <span
              className={cn(
                'text-xs px-2 py-0.5 rounded-full font-medium',
                hasError && 'bg-[#F85149]/10 text-[#F85149]',
                isRunning && 'bg-[#60A5FA]/10 text-[#60A5FA]',
                allSuccess && 'bg-[#3FB950]/10 text-[#3FB950]',
                !hasError && !isRunning && !allSuccess && 'bg-[#21262D] text-[#6E7681]'
              )}
            >
              {hasError && 'Failed'}
              {isRunning && 'Running'}
              {allSuccess && 'Passed'}
              {!hasError && !isRunning && !allSuccess && 'Pending'}
            </span>
          </div>

          {/* Iteration counter */}
          <IterationCounter current={iteration} max={maxIterations} size="sm" showProgress />
        </div>

        {/* Steps */}
        <div
          className={cn(
            'p-4',
            orientation === 'horizontal' && 'flex items-center justify-between gap-2 sm:gap-4',
            orientation === 'vertical' && 'flex flex-col gap-4'
          )}
        >
          {orderedSteps.map((step, index) => (
            <React.Fragment key={step.type}>
              <StepItem
                step={step}
                isLast={index === orderedSteps.length - 1}
                orientation={orientation}
                onViewLogs={onViewLogs ? () => { onViewLogs(step.type); } : undefined}
              />

              {/* Horizontal connector arrow */}
              {orientation === 'horizontal' && index < orderedSteps.length - 1 && (
                <ChevronRight
                  size={16}
                  className="text-[#30363D] flex-shrink-0 hidden sm:block"
                />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Error message (if any) */}
        {hasError && (
          <div className="px-4 pb-4">
            {steps
              .filter((s) => s.status === 'error' && s.error)
              .map((step) => (
                <div
                  key={step.type}
                  className={cn(
                    "text-sm text-[#F85149] rounded-lg px-3 py-2 font-mono",
                    "bg-[#F85149]/10 border border-[#F85149]/20"
                  )}
                >
                  <span className="font-semibold">{STEP_CONFIG[step.type].label}:</span>{' '}
                  {step.error}
                </div>
              ))}
          </div>
        )}
      </div>
    )
  }
)

QAStatusPanel.displayName = 'QAStatusPanel'

export default QAStatusPanel
