/**
 * QAStatusPanel Component
 *
 * Displays the status of QA pipeline steps: Build, Lint, Test, Review.
 * Shows step-by-step progress with icons, status indicators, and optional output.
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

/** Step configuration with icons and labels */
const STEP_CONFIG: Record<QAStepType, { icon: typeof Hammer; label: string; color: string }> = {
  build: { icon: Hammer, label: 'Build', color: '#60A5FA' }, // blue
  lint: { icon: FileSearch, label: 'Lint', color: '#A78BFA' }, // purple
  test: { icon: TestTube2, label: 'Test', color: '#34D399' }, // green
  review: { icon: Eye, label: 'Review', color: '#FBBF24' }, // yellow
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
      return <CheckCircle2 size={16} className="text-accent-success" />
    case 'error':
      return <XCircle size={16} className="text-accent-error" />
    case 'running':
      return <Loader2 size={16} className="text-accent-info animate-spin" />
    case 'skipped':
      return <MinusCircle size={16} className="text-text-tertiary" />
    case 'pending':
    default:
      return <Clock size={16} className="text-text-tertiary" />
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
          'w-10 h-10 rounded-full',
          'transition-all duration-normal',
          'border-2',

          // Status-based styling
          step.status === 'pending' && 'border-border-default bg-bg-dark/50',
          step.status === 'running' && 'border-accent-info bg-accent-info/10',
          step.status === 'success' && 'border-accent-success bg-accent-success/10',
          step.status === 'error' && 'border-accent-error bg-accent-error/10',
          step.status === 'skipped' && 'border-border-subtle bg-bg-muted/30',

          // Interactive states
          isInteractive && [
            'cursor-pointer',
            'hover:scale-105',
            'hover:shadow-md',
            'focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-bg-card',
          ],
          !isInteractive && 'cursor-default'
        )}
        title={isInteractive ? `View ${config.label} logs` : undefined}
      >
        {step.status === 'running' ? (
          <Loader2 size={18} className="animate-spin" style={{ color: config.color }} />
        ) : (
          <Icon
            size={18}
            style={{
              color:
                step.status === 'skipped' || step.status === 'pending'
                  ? 'var(--color-text-tertiary)'
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
              ? 'text-text-tertiary'
              : 'text-text-primary'
          )}
        >
          {config.label}
        </span>

        {/* Duration or status text */}
        <span className="text-xs text-text-tertiary">
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
            <span className="text-xs mt-0.5">
              <span className="text-accent-success">{step.testCounts.passed}</span>
              <span className="text-text-tertiary"> / </span>
              {step.testCounts.failed > 0 && (
                <>
                  <span className="text-accent-error">{step.testCounts.failed}</span>
                  <span className="text-text-tertiary"> / </span>
                </>
              )}
              <span className="text-text-tertiary">{step.testCounts.skipped} skip</span>
            </span>
          )}
      </div>

      {/* Connector line (not for last item) */}
      {!isLast && (
        <div
          className={cn(
            orientation === 'horizontal' ? 'hidden sm:block w-8 h-0.5' : 'hidden',
            'bg-border-default mx-2'
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
        className={cn('rounded-lg border border-border-default bg-bg-card', className)}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-default">
          <div className="flex items-center gap-2">
            <span className="font-medium text-text-primary">QA Pipeline</span>

            {/* Overall status badge */}
            <span
              className={cn(
                'text-xs px-2 py-0.5 rounded-full',
                hasError && 'bg-accent-error/20 text-accent-error',
                isRunning && 'bg-accent-info/20 text-accent-info',
                allSuccess && 'bg-accent-success/20 text-accent-success',
                !hasError && !isRunning && !allSuccess && 'bg-text-muted/20 text-text-muted'
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
                  className="text-border-default flex-shrink-0 hidden sm:block"
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
                  className="text-sm text-accent-error bg-accent-error/10 rounded-md px-3 py-2 font-mono"
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
