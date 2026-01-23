/**
 * TaskDetailModal Component
 *
 * A comprehensive task detail modal with 5 tabs:
 * - Overview: Full description, acceptance criteria
 * - Dependencies: Upstream/downstream dependencies
 * - Files: Files to create/modify
 * - Logs: Real-time log output
 * - History: Timeline of status changes
 *
 * Based on Phase 24 requirements and Auto-Claude reference patterns.
 */

import { useState, useRef, useEffect, useMemo, type ReactElement } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@renderer/components/ui/dialog'
import { Button } from '@renderer/components/ui/button'
import { ScrollArea } from '@renderer/components/ui/scroll-area'
import { cn } from '@renderer/lib/utils'
import type {
  KanbanTask,
  KanbanTaskStatus,
  TaskComplexity,
  TaskLogLevel
} from '@/types/execution'
import type { AgentType } from '@/types/agent'
import {
  Clock,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Lock,
  Play,
  Square,
  RotateCcw,
  SkipForward,
  ArrowRight,
  FileText,
  FilePlus,
  FileEdit,
  Copy,
  ChevronDown,
  ChevronRight,
  Bot,
  Code,
  TestTube,
  Eye,
  GitMerge,
  AlertTriangle,
  Info,
  Bug
} from 'lucide-react'

// ============================================================================
// Types
// ============================================================================

export interface TaskDetailModalProps {
  /** Task data to display */
  task: KanbanTask | null
  /** All tasks in the project (for dependency display) */
  allTasks?: KanbanTask[]
  /** Whether the modal is open */
  open: boolean
  /** Callback when modal open state changes */
  onOpenChange: (open: boolean) => void
  /** Callback to start a specific task */
  onStartTask?: (taskId: string) => Promise<void>
  /** Callback to cancel a task */
  onCancelTask?: (taskId: string) => Promise<void>
  /** Callback to retry a failed task */
  onRetryTask?: (taskId: string) => Promise<void>
  /** Callback to skip a task */
  onSkipTask?: (taskId: string) => Promise<void>
  /** Callback to reopen a completed task */
  onReopenTask?: (taskId: string) => Promise<void>
}

type TabId = 'overview' | 'dependencies' | 'files' | 'logs' | 'history'

interface TabConfig {
  id: TabId
  label: string
  icon: React.ComponentType<{ className?: string }>
}

// ============================================================================
// Constants
// ============================================================================

const TABS: TabConfig[] = [
  { id: 'overview', label: 'Overview', icon: FileText },
  { id: 'dependencies', label: 'Dependencies', icon: GitMerge },
  { id: 'files', label: 'Files', icon: FileEdit },
  { id: 'logs', label: 'Logs', icon: Bug },
  { id: 'history', label: 'History', icon: Clock }
]

// Priority styles
const PRIORITY_STYLES: Record<string, string> = {
  critical: 'bg-red-500 text-white',
  high: 'bg-orange-500 text-white',
  medium: 'bg-yellow-500 text-black',
  low: 'bg-emerald-500 text-white'
}

const PRIORITY_LABELS: Record<string, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low'
}

// Status styles
const STATUS_STYLES: Record<KanbanTaskStatus, { bg: string; text: string; label: string }> = {
  pending: { bg: 'bg-slate-500/20', text: 'text-slate-400', label: 'Pending' },
  ready: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'Ready' },
  queued: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Queued' },
  'in-progress': { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'In Progress' },
  'ai-review': { bg: 'bg-violet-500/20', text: 'text-violet-400', label: 'AI Review' },
  'human-review': { bg: 'bg-purple-500/20', text: 'text-purple-400', label: 'Human Review' },
  blocked: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Blocked' },
  completed: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'Completed' },
  failed: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Failed' },
  cancelled: { bg: 'bg-slate-500/20', text: 'text-slate-400', label: 'Cancelled' }
}

// Complexity config
const COMPLEXITY_CONFIG: Record<TaskComplexity, { label: string; fullLabel: string; class: string }> = {
  trivial: { label: 'XS', fullLabel: 'Trivial', class: 'bg-slate-500/20 text-slate-300' },
  simple: { label: 'S', fullLabel: 'Simple', class: 'bg-emerald-500/20 text-emerald-300' },
  moderate: { label: 'M', fullLabel: 'Moderate', class: 'bg-blue-500/20 text-blue-300' },
  complex: { label: 'L', fullLabel: 'Complex', class: 'bg-purple-500/20 text-purple-300' },
  'very-complex': { label: 'XL', fullLabel: 'Very Complex', class: 'bg-red-500/20 text-red-300' }
}

// Agent icons
const AGENT_ICONS: Record<AgentType, React.ComponentType<{ className?: string }>> = {
  planner: Bot,
  coder: Code,
  reviewer: Eye,
  tester: TestTube,
  merger: GitMerge
}

const AGENT_LABELS: Record<AgentType, string> = {
  planner: 'Planner',
  coder: 'Coder',
  reviewer: 'Reviewer',
  tester: 'Tester',
  merger: 'Merger'
}

// Log level config
const LOG_LEVEL_CONFIG: Record<TaskLogLevel, { icon: React.ComponentType<{ className?: string }>; class: string }> = {
  info: { icon: Info, class: 'text-blue-400' },
  warning: { icon: AlertTriangle, class: 'text-amber-400' },
  error: { icon: AlertCircle, class: 'text-red-400' },
  debug: { icon: Bug, class: 'text-slate-400' }
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatTime(minutes: number | null | undefined): string {
  if (!minutes) return '-'
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-'
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return '-'
  }
}

function formatTimestamp(dateStr: string | null | undefined): string {
  if (!dateStr) return '-'
  try {
    const date = new Date(dateStr)
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  } catch {
    return '-'
  }
}

// ============================================================================
// Sub-components
// ============================================================================

/** Badge component for displaying status, priority, etc. */
function Badge({
  children,
  className
}: {
  children: React.ReactNode
  className?: string
}): ReactElement {
  return (
    <span
      className={cn(
        'px-2 py-0.5 text-xs font-medium rounded',
        className
      )}
    >
      {children}
    </span>
  )
}

/** Metadata item component */
function MetadataItem({
  label,
  value,
  icon: Icon
}: {
  label: string
  value: React.ReactNode
  icon?: React.ComponentType<{ className?: string }>
}): ReactElement {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-text-tertiary">{label}</span>
      <div className="flex items-center gap-1.5 text-sm text-text-primary">
        {Icon && <Icon className="h-4 w-4 text-text-secondary" />}
        {value}
      </div>
    </div>
  )
}

/** Tab button component */
function TabButton({
  tab,
  isActive,
  onClick,
  count
}: {
  tab: TabConfig
  isActive: boolean
  onClick: () => void
  count?: number
}): ReactElement {
  const Icon = tab.icon
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors',
        'border-b-2 -mb-px',
        isActive
          ? 'border-accent-primary text-accent-primary'
          : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border-default'
      )}
    >
      <Icon className="h-4 w-4" />
      <span>{tab.label}</span>
      {count !== undefined && count > 0 && (
        <span className="px-1.5 py-0.5 text-xs rounded-full bg-bg-tertiary">
          {count}
        </span>
      )}
    </button>
  )
}

// ============================================================================
// Tab Content Components
// ============================================================================

/** Overview Tab Content */
function OverviewTab({ task }: { task: KanbanTask }): ReactElement {
  return (
    <div className="space-y-6 p-4">
      {/* Description Section */}
      <div>
        <h4 className="text-sm font-medium text-text-primary mb-2">Description</h4>
        <p className="text-sm text-text-secondary whitespace-pre-wrap">
          {task.description || 'No description provided.'}
        </p>
      </div>

      {/* Acceptance Criteria */}
      {task.acceptanceCriteria.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-text-primary mb-2">
            Acceptance Criteria ({task.acceptanceCriteria.length})
          </h4>
          <ul className="space-y-2">
            {task.acceptanceCriteria.map((criterion, index) => (
              <li
                key={index}
                className="flex items-start gap-2 text-sm text-text-secondary"
              >
                <div className="mt-1 h-4 w-4 flex-shrink-0 rounded border border-border-default flex items-center justify-center">
                  {task.status === 'completed' && (
                    <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                  )}
                </div>
                <span>{criterion}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Task Metadata Grid */}
      <div>
        <h4 className="text-sm font-medium text-text-primary mb-3">Details</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <MetadataItem
            label="Priority"
            value={
              <Badge className={PRIORITY_STYLES[task.priority]}>
                {PRIORITY_LABELS[task.priority] || task.priority}
              </Badge>
            }
          />
          <MetadataItem
            label="Complexity"
            value={
              <Badge className={COMPLEXITY_CONFIG[task.complexity].class}>
                {COMPLEXITY_CONFIG[task.complexity].fullLabel}
              </Badge>
            }
          />
          <MetadataItem
            label="Status"
            value={
              <Badge className={cn(STATUS_STYLES[task.status].bg, STATUS_STYLES[task.status].text)}>
                {STATUS_STYLES[task.status].label}
              </Badge>
            }
          />
          <MetadataItem
            label="Estimated Time"
            value={formatTime(task.estimatedMinutes)}
            icon={Clock}
          />
          {task.actualMinutes && (
            <MetadataItem
              label="Actual Time"
              value={formatTime(task.actualMinutes)}
              icon={Clock}
            />
          )}
          {task.assignedAgent && (
            <MetadataItem
              label="Assigned Agent"
              value={AGENT_LABELS[task.assignedAgent]}
              icon={AGENT_ICONS[task.assignedAgent]}
            />
          )}
          <MetadataItem
            label="Created"
            value={formatDate(task.createdAt)}
            icon={Calendar}
          />
          {task.startedAt && (
            <MetadataItem
              label="Started"
              value={formatDate(task.startedAt)}
              icon={Calendar}
            />
          )}
          {task.completedAt && (
            <MetadataItem
              label="Completed"
              value={formatDate(task.completedAt)}
              icon={Calendar}
            />
          )}
          <MetadataItem
            label="Retries"
            value={`${task.retryCount} / ${task.maxRetries}`}
          />
          <MetadataItem
            label="QA Iterations"
            value={`${task.qaIterations} / ${task.maxQAIterations}`}
          />
        </div>
      </div>

      {/* Progress */}
      {task.progress > 0 && (
        <div>
          <h4 className="text-sm font-medium text-text-primary mb-2">Progress</h4>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-bg-tertiary rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-300',
                  task.status === 'completed' ? 'bg-emerald-500' :
                  task.status === 'failed' ? 'bg-red-500' :
                  'bg-accent-primary'
                )}
                style={{ width: `${task.progress}%` }}
              />
            </div>
            <span className="text-sm text-text-secondary tabular-nums w-12 text-right">
              {task.progress}%
            </span>
          </div>
        </div>
      )}

      {/* Errors */}
      {task.errors.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-red-400 mb-2">
            Errors ({task.errors.length})
          </h4>
          <div className="space-y-2">
            {task.errors.map((error) => (
              <div
                key={error.id}
                className={cn(
                  'p-3 rounded-lg text-sm',
                  error.resolved ? 'bg-slate-500/10' : 'bg-red-500/10'
                )}
              >
                <div className="flex items-start gap-2">
                  <AlertCircle className={cn('h-4 w-4 mt-0.5 flex-shrink-0', error.resolved ? 'text-slate-400' : 'text-red-400')} />
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-text-primary', error.resolved && 'line-through opacity-60')}>
                      {error.message}
                    </p>
                    {error.stack && (
                      <pre className="mt-2 text-xs text-text-tertiary overflow-x-auto">
                        {error.stack}
                      </pre>
                    )}
                    <div className="mt-1 flex items-center gap-2 text-xs text-text-tertiary">
                      <span>{formatTimestamp(error.timestamp)}</span>
                      {error.recoverable && <span className="text-amber-400">Recoverable</span>}
                      {error.resolved && <span className="text-emerald-400">Resolved</span>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/** Dependencies Tab Content */
function DependenciesTab({
  task,
  allTasks
}: {
  task: KanbanTask
  allTasks: KanbanTask[]
}): ReactElement {
  // Find upstream dependencies (tasks this task depends on)
  const upstreamTasks = useMemo(() => {
    return task.dependsOn
      .map(id => allTasks.find(t => t.id === id))
      .filter((t): t is KanbanTask => t !== undefined)
  }, [task.dependsOn, allTasks])

  // Find downstream tasks (tasks that depend on this task)
  const downstreamTasks = useMemo(() => {
    return allTasks.filter(t => t.dependsOn.includes(task.id))
  }, [task.id, allTasks])

  // Find blocking tasks (uncompleted upstream dependencies)
  const blockingTasks = useMemo(() => {
    return upstreamTasks.filter(t => t.status !== 'completed')
  }, [upstreamTasks])

  return (
    <div className="space-y-6 p-4">
      {/* Blocking Warning */}
      {blockingTasks.length > 0 && (
        <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/20">
          <div className="flex items-center gap-2 text-red-400">
            <Lock className="h-4 w-4" />
            <span className="text-sm font-medium">
              Blocked by {blockingTasks.length} incomplete {blockingTasks.length === 1 ? 'task' : 'tasks'}
            </span>
          </div>
        </div>
      )}

      {/* Upstream Dependencies */}
      <div>
        <h4 className="text-sm font-medium text-text-primary mb-3 flex items-center gap-2">
          <ArrowRight className="h-4 w-4 rotate-180" />
          Depends On ({upstreamTasks.length})
        </h4>
        {upstreamTasks.length === 0 ? (
          <p className="text-sm text-text-tertiary">No dependencies. This task can start immediately.</p>
        ) : (
          <div className="space-y-2">
            {upstreamTasks.map(t => {
              const isComplete = t.status === 'completed'
              const statusStyle = STATUS_STYLES[t.status]
              return (
                <div
                  key={t.id}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg',
                    isComplete ? 'bg-emerald-500/5' : 'bg-bg-secondary'
                  )}
                >
                  <div className="flex-shrink-0">
                    {isComplete ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    ) : t.status === 'in-progress' ? (
                      <Loader2 className="h-5 w-5 text-amber-400 animate-spin" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-border-default" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-sm text-text-primary', isComplete && 'line-through opacity-60')}>
                      {t.title}
                    </p>
                    <Badge className={cn('mt-1', statusStyle.bg, statusStyle.text)}>
                      {statusStyle.label}
                    </Badge>
                  </div>
                  {!isComplete && (
                    <span className="text-xs text-red-400 font-medium">BLOCKING</span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Downstream Dependencies */}
      <div>
        <h4 className="text-sm font-medium text-text-primary mb-3 flex items-center gap-2">
          <ArrowRight className="h-4 w-4" />
          Blocks ({downstreamTasks.length})
        </h4>
        {downstreamTasks.length === 0 ? (
          <p className="text-sm text-text-tertiary">No tasks depend on this task.</p>
        ) : (
          <div className="space-y-2">
            {downstreamTasks.map(t => {
              const statusStyle = STATUS_STYLES[t.status]
              return (
                <div
                  key={t.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-bg-secondary"
                >
                  <div className="flex-shrink-0">
                    <Clock className="h-5 w-5 text-text-tertiary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary">{t.title}</p>
                    <Badge className={cn('mt-1', statusStyle.bg, statusStyle.text)}>
                      {statusStyle.label}
                    </Badge>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

/** Files Tab Content */
function FilesTab({ task }: { task: KanbanTask }): ReactElement {
  const totalFiles = task.filesToCreate.length + task.filesToModify.length

  if (totalFiles === 0) {
    return (
      <div className="flex items-center justify-center h-full text-text-tertiary text-sm">
        No file changes planned for this task.
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4">
      {/* Files to Create */}
      {task.filesToCreate.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-text-primary mb-3 flex items-center gap-2">
            <FilePlus className="h-4 w-4 text-emerald-400" />
            Files to Create ({task.filesToCreate.length})
          </h4>
          <div className="space-y-1">
            {task.filesToCreate.map((file, index) => {
              const isCreated = task.filesCreated.includes(file)
              return (
                <div
                  key={index}
                  className={cn(
                    'flex items-center gap-2 p-2 rounded text-sm font-mono',
                    isCreated ? 'bg-emerald-500/10' : 'bg-bg-secondary'
                  )}
                >
                  {isCreated ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                  ) : (
                    <FilePlus className="h-4 w-4 text-text-tertiary flex-shrink-0" />
                  )}
                  <span className={cn('text-text-secondary truncate', isCreated && 'text-emerald-300')}>
                    {file}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Files to Modify */}
      {task.filesToModify.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-text-primary mb-3 flex items-center gap-2">
            <FileEdit className="h-4 w-4 text-amber-400" />
            Files to Modify ({task.filesToModify.length})
          </h4>
          <div className="space-y-1">
            {task.filesToModify.map((file, index) => {
              const isModified = task.filesModified.includes(file)
              return (
                <div
                  key={index}
                  className={cn(
                    'flex items-center gap-2 p-2 rounded text-sm font-mono',
                    isModified ? 'bg-amber-500/10' : 'bg-bg-secondary'
                  )}
                >
                  {isModified ? (
                    <CheckCircle2 className="h-4 w-4 text-amber-400 flex-shrink-0" />
                  ) : (
                    <FileEdit className="h-4 w-4 text-text-tertiary flex-shrink-0" />
                  )}
                  <span className={cn('text-text-secondary truncate', isModified && 'text-amber-300')}>
                    {file}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="pt-4 border-t border-border-default">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-text-tertiary">Created: </span>
            <span className="text-emerald-400 font-medium">
              {task.filesCreated.length} / {task.filesToCreate.length}
            </span>
          </div>
          <div>
            <span className="text-text-tertiary">Modified: </span>
            <span className="text-amber-400 font-medium">
              {task.filesModified.length} / {task.filesToModify.length}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Logs Tab Content */
function LogsTab({ task }: { task: KanbanTask }): ReactElement {
  const logsEndRef = useRef<HTMLDivElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set())

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [task.logs.length, autoScroll])

  const handleCopyLogs = (): void => {
    const logsText = task.logs
      .map(log => `[${formatTimestamp(log.timestamp)}] [${log.level.toUpperCase()}] ${log.message}${log.details ? '\n' + log.details : ''}`)
      .join('\n')
    void navigator.clipboard.writeText(logsText)
  }

  const toggleLogExpand = (logId: string): void => {
    setExpandedLogs(prev => {
      const next = new Set(prev)
      if (next.has(logId)) {
        next.delete(logId)
      } else {
        next.add(logId)
      }
      return next
    })
  }

  if (task.logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-text-tertiary text-sm gap-2">
        <Bug className="h-8 w-8 opacity-50" />
        <span>No logs yet. Logs will appear here during task execution.</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border-default">
        <div className="flex items-center gap-2">
          <span className="text-sm text-text-secondary">
            {task.logs.length} log entries
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setAutoScroll(!autoScroll); }}
            className={cn(!autoScroll && 'opacity-50')}
          >
            Auto-scroll {autoScroll ? 'ON' : 'OFF'}
          </Button>
          <Button variant="ghost" size="sm" onClick={handleCopyLogs}>
            <Copy className="h-4 w-4 mr-1" />
            Copy
          </Button>
        </div>
      </div>

      {/* Logs List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-1 font-mono text-xs">
          {task.logs.map(log => {
            const config = LOG_LEVEL_CONFIG[log.level]
            const Icon = config.icon
            const isExpanded = expandedLogs.has(log.id)
            const hasDetails = !!log.details

            return (
              <div
                key={log.id}
                className={cn(
                  'flex items-start gap-2 p-2 rounded hover:bg-bg-secondary/50',
                  log.level === 'error' && 'bg-red-500/5',
                  log.level === 'warning' && 'bg-amber-500/5'
                )}
              >
                <Icon className={cn('h-4 w-4 mt-0.5 flex-shrink-0', config.class)} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2">
                    <span className="text-text-tertiary flex-shrink-0">
                      {formatTimestamp(log.timestamp)}
                    </span>
                    {log.phase && (
                      <Badge className="bg-bg-tertiary text-text-tertiary">
                        {log.phase}
                      </Badge>
                    )}
                    <span className="text-text-secondary break-words">
                      {log.message}
                    </span>
                  </div>
                  {hasDetails && (
                    <>
                      <button
                        type="button"
                        onClick={() => { toggleLogExpand(log.id); }}
                        className="flex items-center gap-1 mt-1 text-text-tertiary hover:text-text-secondary"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-3 w-3" />
                        ) : (
                          <ChevronRight className="h-3 w-3" />
                        )}
                        <span>Details</span>
                      </button>
                      {isExpanded && (
                        <pre className="mt-2 p-2 bg-bg-tertiary rounded text-text-tertiary overflow-x-auto whitespace-pre-wrap">
                          {log.details}
                        </pre>
                      )}
                    </>
                  )}
                </div>
              </div>
            )
          })}
          <div ref={logsEndRef} />
        </div>
      </ScrollArea>
    </div>
  )
}

/** History Tab Content */
function HistoryTab({ task }: { task: KanbanTask }): ReactElement {
  if (task.statusHistory.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-text-tertiary text-sm gap-2">
        <Clock className="h-8 w-8 opacity-50" />
        <span>No history yet.</span>
      </div>
    )
  }

  return (
    <div className="p-4">
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-border-default" />

        {/* Timeline entries */}
        <div className="space-y-4">
          {task.statusHistory.map((entry, index) => {
            const toStyle = STATUS_STYLES[entry.toStatus]
            const isLatest = index === task.statusHistory.length - 1

            return (
              <div key={index} className="relative flex items-start gap-4 pl-6">
                {/* Timeline dot */}
                <div
                  className={cn(
                    'absolute left-0 w-3.5 h-3.5 rounded-full border-2 bg-bg-primary',
                    isLatest ? 'border-accent-primary' : 'border-border-default'
                  )}
                />

                {/* Content */}
                <div className="flex-1 min-w-0 pb-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-text-tertiary">
                      {formatDate(entry.timestamp)}
                    </span>
                    {entry.agentId && (
                      <Badge className="bg-bg-tertiary text-text-tertiary">
                        {entry.agentId}
                      </Badge>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    {entry.fromStatus && (
                      <>
                        <Badge className={cn(STATUS_STYLES[entry.fromStatus].bg, STATUS_STYLES[entry.fromStatus].text)}>
                          {STATUS_STYLES[entry.fromStatus].label}
                        </Badge>
                        <ArrowRight className="h-3 w-3 text-text-tertiary" />
                      </>
                    )}
                    <Badge className={cn(toStyle.bg, toStyle.text)}>
                      {toStyle.label}
                    </Badge>
                  </div>
                  {entry.reason && (
                    <p className="mt-1 text-sm text-text-secondary">{entry.reason}</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * TaskDetailModal - Comprehensive task detail modal with 5 tabs
 */
export function TaskDetailModal({
  task,
  allTasks = [],
  open,
  onOpenChange,
  onStartTask,
  onCancelTask,
  onRetryTask,
  onSkipTask,
  onReopenTask
}: TaskDetailModalProps): ReactElement | null {
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [isLoading, setIsLoading] = useState(false)

  // Don't render if no task
  if (!task) return null

  // Determine available actions based on status
  const canStart = task.status === 'pending' || task.status === 'ready'
  const canCancel = task.status === 'in-progress' || task.status === 'queued'
  const canRetry = task.status === 'failed'
  const canSkip = task.status === 'failed' || task.status === 'blocked'
  const canReopen = task.status === 'completed' || task.status === 'cancelled'
  const isBlocked = task.status === 'blocked' || task.blockedBy.length > 0

  // Tab counts
  const tabCounts: Partial<Record<TabId, number>> = {
    dependencies: task.dependsOn.length + allTasks.filter(t => t.dependsOn.includes(task.id)).length,
    files: task.filesToCreate.length + task.filesToModify.length,
    logs: task.logs.length,
    history: task.statusHistory.length
  }

  // Action handlers
  const handleAction = async (action: () => Promise<void>): Promise<void> => {
    setIsLoading(true)
    try {
      await action()
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="p-4 pb-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {/* Title Row */}
              <div className="flex items-center gap-2 mb-2">
                {/* Priority Badge */}
                <Badge className={PRIORITY_STYLES[task.priority]}>
                  P{task.priority === 'critical' ? '0' : task.priority === 'high' ? '1' : task.priority === 'medium' ? '2' : '3'}
                </Badge>
                {/* Status Badge */}
                <Badge className={cn(STATUS_STYLES[task.status].bg, STATUS_STYLES[task.status].text)}>
                  {STATUS_STYLES[task.status].label}
                </Badge>
                {/* Blocked indicator */}
                {isBlocked && (
                  <Badge className="bg-red-500/20 text-red-400 flex items-center gap-1">
                    <Lock className="h-3 w-3" />
                    Blocked
                  </Badge>
                )}
              </div>
              <DialogTitle className="text-xl text-text-primary">
                {task.title}
              </DialogTitle>
              <DialogDescription className="mt-1">
                <span className="text-text-tertiary">ID: {task.id}</span>
                {task.assignedAgent && (
                  <>
                    <span className="mx-2 text-text-tertiary">|</span>
                    <span className="text-text-tertiary">
                      Agent: {AGENT_LABELS[task.assignedAgent]}
                    </span>
                  </>
                )}
              </DialogDescription>
            </div>
          </div>

          {/* Progress bar (when in progress) */}
          {task.status === 'in-progress' && task.progress > 0 && (
            <div className="mt-3 flex items-center gap-3">
              <div className="flex-1 h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all duration-300"
                  style={{ width: `${task.progress}%` }}
                />
              </div>
              <span className="text-xs text-text-secondary tabular-nums w-10 text-right">
                {task.progress}%
              </span>
            </div>
          )}
        </DialogHeader>

        {/* Tabs */}
        <div className="border-b border-border-default px-4 mt-4">
          <div className="flex items-center gap-0 overflow-x-auto">
            {TABS.map(tab => (
              <TabButton
                key={tab.id}
                tab={tab}
                isActive={activeTab === tab.id}
                onClick={() => { setActiveTab(tab.id); }}
                count={tabCounts[tab.id]}
              />
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <ScrollArea className="h-full max-h-[calc(90vh-220px)]">
            {activeTab === 'overview' && <OverviewTab task={task} />}
            {activeTab === 'dependencies' && <DependenciesTab task={task} allTasks={allTasks} />}
            {activeTab === 'files' && <FilesTab task={task} />}
            {activeTab === 'logs' && <LogsTab task={task} />}
            {activeTab === 'history' && <HistoryTab task={task} />}
          </ScrollArea>
        </div>

        {/* Footer Actions */}
        <DialogFooter className="p-4 border-t border-border-default flex-row justify-between">
          <div className="flex items-center gap-2">
            {/* Left side actions */}
            {canSkip && onSkipTask && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void handleAction(() => onSkipTask(task.id))}
                disabled={isLoading}
                className="text-text-secondary hover:text-amber-400"
              >
                <SkipForward className="h-4 w-4 mr-1" />
                Skip
              </Button>
            )}
            {canReopen && onReopenTask && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void handleAction(() => onReopenTask(task.id))}
                disabled={isLoading}
                className="text-text-secondary"
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Reopen
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Right side actions */}
            {canRetry && onRetryTask && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => void handleAction(() => onRetryTask(task.id))}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <RotateCcw className="h-4 w-4 mr-1" />
                )}
                Retry
              </Button>
            )}
            {canCancel && onCancelTask && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => void handleAction(() => onCancelTask(task.id))}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Square className="h-4 w-4 mr-1" />
                )}
                Cancel
              </Button>
            )}
            {canStart && onStartTask && (
              <Button
                variant="default"
                size="sm"
                onClick={() => void handleAction(() => onStartTask(task.id))}
                disabled={isLoading || isBlocked}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 mr-1" />
                )}
                Start Now
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => { onOpenChange(false); }}>
              Close
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default TaskDetailModal
