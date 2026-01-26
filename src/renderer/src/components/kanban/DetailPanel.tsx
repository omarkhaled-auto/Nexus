/**
 * DetailPanel - Linear-inspired slide-out detail panel
 *
 * A unified panel that replaces centered modals with a right-aligned
 * slide-out panel. Supports both Feature and KanbanTask types.
 *
 * Features:
 * - Slide animation from right (200ms, Linear easing)
 * - Inline editable status/priority
 * - Reorganized tabs
 * - Footer actions
 */

import { useState, useEffect, type ReactElement, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@renderer/components/ui/button'
import { ScrollArea } from '@renderer/components/ui/scroll-area'
import { cn } from '@renderer/lib/utils'
import type { Feature, FeaturePriority, FeatureStatus, FeatureTask } from '@renderer/types/feature'
import type { KanbanTask, KanbanTaskStatus, TaskComplexity, TaskLogLevel } from '@/types/execution'
import type { AgentType } from '@/types/agent'
import {
  X,
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
  Bug,
  Circle,
  Trash2
} from 'lucide-react'

// ============================================================================
// Types
// ============================================================================

export type DetailPanelMode = 'feature' | 'task'

export interface DetailPanelProps {
  /** Whether the panel is open */
  open: boolean
  /** Callback when panel should close */
  onClose: () => void
  /** The mode determines which type of content to display */
  mode: DetailPanelMode
  /** Feature data (when mode === 'feature') */
  feature?: Feature | null
  /** Task data (when mode === 'task') */
  task?: KanbanTask | null
  /** All tasks (for dependency display in task mode) */
  allTasks?: KanbanTask[]
  /** Feature action handlers */
  onDeleteFeature?: (featureId: string) => Promise<void>
  onUpdateFeature?: (featureId: string, updates: Partial<Feature>) => Promise<void>
  /** Task action handlers */
  onStartTask?: (taskId: string) => Promise<void> | void
  onCancelTask?: (taskId: string) => Promise<void> | void
  onRetryTask?: (taskId: string) => Promise<void> | void
  onSkipTask?: (taskId: string) => Promise<void> | void
  onReopenTask?: (taskId: string) => Promise<void> | void
}

type TabId = 'overview' | 'dependencies' | 'files' | 'logs' | 'history'

interface TabConfig {
  id: TabId
  label: string
  icon: React.ComponentType<{ className?: string }>
  showFor: DetailPanelMode[]
}

// ============================================================================
// Constants
// ============================================================================

const PANEL_WIDTH = 600

const TABS: TabConfig[] = [
  { id: 'overview', label: 'Overview', icon: FileText, showFor: ['feature', 'task'] },
  { id: 'dependencies', label: 'Dependencies', icon: GitMerge, showFor: ['task'] },
  { id: 'files', label: 'Files', icon: FileEdit, showFor: ['task'] },
  { id: 'logs', label: 'Logs', icon: Bug, showFor: ['task'] },
  { id: 'history', label: 'History', icon: Clock, showFor: ['task'] }
]

// Priority styles
const PRIORITY_COLORS: Record<string, string> = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  normal: 'bg-blue-500',
  low: 'bg-green-500'
}

const PRIORITY_LABELS: Record<string, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  normal: 'Normal',
  low: 'Low'
}

// Feature status styles
const FEATURE_STATUS_LABELS: Record<FeatureStatus, string> = {
  backlog: 'Backlog',
  planning: 'Planning',
  in_progress: 'In Progress',
  ai_review: 'AI Review',
  human_review: 'Human Review',
  done: 'Done'
}

// Task status styles
const TASK_STATUS_STYLES: Record<KanbanTaskStatus, { bg: string; text: string; label: string }> = {
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
const COMPLEXITY_CONFIG: Record<TaskComplexity, { label: string; class: string }> = {
  trivial: { label: 'Trivial', class: 'bg-slate-500/20 text-slate-300' },
  simple: { label: 'Simple', class: 'bg-emerald-500/20 text-emerald-300' },
  moderate: { label: 'Moderate', class: 'bg-blue-500/20 text-blue-300' },
  complex: { label: 'Complex', class: 'bg-purple-500/20 text-purple-300' },
  'very-complex': { label: 'Very Complex', class: 'bg-red-500/20 text-red-300' }
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
      year: 'numeric'
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

function Badge({ children, className }: { children: ReactNode; className?: string }): ReactElement {
  return (
    <span className={cn('px-2 py-0.5 text-xs font-medium rounded', className)}>
      {children}
    </span>
  )
}

function MetadataItem({
  label,
  value,
  icon: Icon
}: {
  label: string
  value: ReactNode
  icon?: React.ComponentType<{ className?: string }>
}): ReactElement {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1.5 text-sm text-foreground">
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        {value}
      </div>
    </div>
  )
}

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
        'flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors',
        'border-b-2 -mb-px',
        isActive
          ? 'border-primary text-primary'
          : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
      )}
    >
      <Icon className="h-4 w-4" />
      <span>{tab.label}</span>
      {count !== undefined && count > 0 && (
        <span className="px-1.5 py-0.5 text-xs rounded-full bg-muted">
          {count}
        </span>
      )}
    </button>
  )
}

// ============================================================================
// Feature Tab Content
// ============================================================================

function FeatureOverviewTab({
  feature,
  onDelete,
  onUpdate,
  isDeleting
}: {
  feature: Feature
  onDelete: () => void
  onUpdate?: (featureId: string, updates: Partial<Feature>) => Promise<void>
  isDeleting: boolean
}): ReactElement {
  const completedTasks = feature.tasks.filter((t) => t.status === 'completed').length
  const totalTasks = feature.tasks.length
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  const taskStatusIcons = {
    pending: Circle,
    in_progress: Loader2,
    completed: CheckCircle2,
    failed: AlertCircle
  }

  const taskStatusColors = {
    pending: 'text-muted-foreground',
    in_progress: 'text-blue-500 animate-spin',
    completed: 'text-green-500',
    failed: 'text-red-500'
  }

  return (
    <div className="space-y-6 p-4">
      {/* Description */}
      <div>
        <h4 className="text-sm font-medium text-foreground mb-2">Description</h4>
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
          {feature.description || 'No description provided.'}
        </p>
      </div>

      {/* Progress */}
      {totalTasks > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{progress}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted">
            <div
              className={cn(
                'h-2 rounded-full transition-all',
                progress === 100 ? 'bg-green-500' : 'bg-primary'
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Metadata - Inline Editable */}
      <div>
        <h4 className="text-sm font-medium text-foreground mb-3">Details</h4>
        <div className="grid grid-cols-2 gap-4">
          {/* Editable Status */}
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Status</span>
            {onUpdate ? (
              <select
                value={feature.status}
                onChange={(e) => void onUpdate(feature.id, { status: e.target.value as FeatureStatus })}
                className="w-full px-2 py-1.5 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {Object.entries(FEATURE_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            ) : (
              <Badge className="bg-primary/20 text-primary">
                {FEATURE_STATUS_LABELS[feature.status]}
              </Badge>
            )}
          </div>
          {/* Editable Priority */}
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Priority</span>
            {onUpdate ? (
              <select
                value={feature.priority}
                onChange={(e) => void onUpdate(feature.id, { priority: e.target.value as FeaturePriority })}
                className="w-full px-2 py-1.5 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            ) : (
              <div className="flex items-center gap-1.5">
                <div className={cn('w-3 h-3 rounded-full', PRIORITY_COLORS[feature.priority])} />
                <span className="text-sm">{PRIORITY_LABELS[feature.priority]}</span>
              </div>
            )}
          </div>
          <MetadataItem
            label="Complexity"
            value={<span className="capitalize">{feature.complexity}</span>}
          />
          {feature.assignedAgent && (
            <MetadataItem
              label="Assigned Agent"
              value={feature.assignedAgent}
            />
          )}
          <MetadataItem
            label="Created"
            value={formatDate(feature.createdAt)}
            icon={Calendar}
          />
        </div>
      </div>

      {/* Tasks */}
      {feature.tasks.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-foreground">
            Tasks ({completedTasks}/{totalTasks})
          </h4>
          <div className="space-y-1">
            {feature.tasks.map((task: FeatureTask) => {
              const Icon = taskStatusIcons[task.status]
              return (
                <div
                  key={task.id}
                  className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-sm"
                >
                  <Icon className={cn('h-4 w-4', taskStatusColors[task.status])} />
                  <span className={task.status === 'completed' ? 'line-through opacity-60' : ''}>
                    {task.title}
                  </span>
                  {task.estimatedMinutes && (
                    <span className="ml-auto text-xs text-muted-foreground">
                      {task.estimatedMinutes}m
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Tags */}
      {feature.tags && feature.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {feature.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Delete Action */}
      <div className="border-t border-border pt-4">
        <Button
          variant="destructive"
          size="sm"
          className="w-full"
          onClick={onDelete}
          disabled={isDeleting}
        >
          {isDeleting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Deleting...
            </>
          ) : (
            <>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Feature
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

// ============================================================================
// Task Tab Content Components
// ============================================================================

function TaskOverviewTab({ task }: { task: KanbanTask }): ReactElement {
  return (
    <div className="space-y-6 p-4">
      {/* Description */}
      <div>
        <h4 className="text-sm font-medium text-foreground mb-2">Description</h4>
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
          {task.description || 'No description provided.'}
        </p>
      </div>

      {/* Acceptance Criteria */}
      {task.acceptanceCriteria.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-foreground mb-2">
            Acceptance Criteria ({task.acceptanceCriteria.length})
          </h4>
          <ul className="space-y-2">
            {task.acceptanceCriteria.map((criterion, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                <div className="mt-1 h-4 w-4 flex-shrink-0 rounded border border-border flex items-center justify-center">
                  {task.status === 'completed' && (
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                  )}
                </div>
                <span>{criterion}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Metadata Grid */}
      <div>
        <h4 className="text-sm font-medium text-foreground mb-3">Details</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <MetadataItem
            label="Priority"
            value={
              <Badge className={cn(PRIORITY_COLORS[task.priority], 'text-white')}>
                {PRIORITY_LABELS[task.priority]}
              </Badge>
            }
          />
          <MetadataItem
            label="Complexity"
            value={
              <Badge className={COMPLEXITY_CONFIG[task.complexity].class}>
                {COMPLEXITY_CONFIG[task.complexity].label}
              </Badge>
            }
          />
          <MetadataItem
            label="Status"
            value={
              <Badge className={cn(TASK_STATUS_STYLES[task.status].bg, TASK_STATUS_STYLES[task.status].text)}>
                {TASK_STATUS_STYLES[task.status].label}
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
          <MetadataItem label="Retries" value={`${task.retryCount} / ${task.maxRetries}`} />
          <MetadataItem label="QA Iterations" value={`${task.qaIterations} / ${task.maxQAIterations}`} />
        </div>
      </div>

      {/* Progress */}
      {task.progress > 0 && (
        <div>
          <h4 className="text-sm font-medium text-foreground mb-2">Progress</h4>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-300',
                  task.status === 'completed' ? 'bg-green-500' :
                  task.status === 'failed' ? 'bg-red-500' :
                  'bg-primary'
                )}
                style={{ width: `${task.progress}%` }}
              />
            </div>
            <span className="text-sm text-muted-foreground tabular-nums w-12 text-right">
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
                  error.resolved ? 'bg-muted/50' : 'bg-red-500/10'
                )}
              >
                <div className="flex items-start gap-2">
                  <AlertCircle className={cn('h-4 w-4 mt-0.5 flex-shrink-0', error.resolved ? 'text-muted-foreground' : 'text-red-400')} />
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-foreground', error.resolved && 'line-through opacity-60')}>
                      {error.message}
                    </p>
                    {error.stack && (
                      <pre className="mt-2 text-xs text-muted-foreground overflow-x-auto">
                        {error.stack}
                      </pre>
                    )}
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatTimestamp(error.timestamp)}</span>
                      {error.recoverable && <span className="text-amber-400">Recoverable</span>}
                      {error.resolved && <span className="text-green-400">Resolved</span>}
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

function DependenciesTab({ task, allTasks }: { task: KanbanTask; allTasks: KanbanTask[] }): ReactElement {
  // Find upstream dependencies
  const upstreamTasks = task.dependsOn
    .map(id => allTasks.find(t => t.id === id))
    .filter((t): t is KanbanTask => t !== undefined)

  // Find downstream tasks
  const downstreamTasks = allTasks.filter(t => t.dependsOn.includes(task.id))

  // Find blocking tasks
  const blockingTasks = upstreamTasks.filter(t => t.status !== 'completed')

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
        <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
          <ArrowRight className="h-4 w-4 rotate-180" />
          Depends On ({upstreamTasks.length})
        </h4>
        {upstreamTasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No dependencies. This task can start immediately.</p>
        ) : (
          <div className="space-y-2">
            {upstreamTasks.map(t => {
              const isComplete = t.status === 'completed'
              const statusStyle = TASK_STATUS_STYLES[t.status]
              return (
                <div
                  key={t.id}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg',
                    isComplete ? 'bg-green-500/5' : 'bg-muted/50'
                  )}
                >
                  <div className="flex-shrink-0">
                    {isComplete ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : t.status === 'in-progress' ? (
                      <Loader2 className="h-5 w-5 text-amber-400 animate-spin" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-border" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-sm text-foreground', isComplete && 'line-through opacity-60')}>
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
        <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
          <ArrowRight className="h-4 w-4" />
          Blocks ({downstreamTasks.length})
        </h4>
        {downstreamTasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tasks depend on this task.</p>
        ) : (
          <div className="space-y-2">
            {downstreamTasks.map(t => {
              const statusStyle = TASK_STATUS_STYLES[t.status]
              return (
                <div key={t.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="flex-shrink-0">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">{t.title}</p>
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

function FilesTab({ task }: { task: KanbanTask }): ReactElement {
  const totalFiles = task.filesToCreate.length + task.filesToModify.length

  if (totalFiles === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm p-8">
        No file changes planned for this task.
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4">
      {/* Files to Create */}
      {task.filesToCreate.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
            <FilePlus className="h-4 w-4 text-green-500" />
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
                    isCreated ? 'bg-green-500/10' : 'bg-muted/50'
                  )}
                >
                  {isCreated ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                  ) : (
                    <FilePlus className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  )}
                  <span className={cn('text-muted-foreground truncate', isCreated && 'text-green-400')}>
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
          <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
            <FileEdit className="h-4 w-4 text-amber-500" />
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
                    isModified ? 'bg-amber-500/10' : 'bg-muted/50'
                  )}
                >
                  {isModified ? (
                    <CheckCircle2 className="h-4 w-4 text-amber-500 flex-shrink-0" />
                  ) : (
                    <FileEdit className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  )}
                  <span className={cn('text-muted-foreground truncate', isModified && 'text-amber-400')}>
                    {file}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="pt-4 border-t border-border">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Created: </span>
            <span className="text-green-400 font-medium">
              {task.filesCreated.length} / {task.filesToCreate.length}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Modified: </span>
            <span className="text-amber-400 font-medium">
              {task.filesModified.length} / {task.filesToModify.length}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function LogsTab({ task }: { task: KanbanTask }): ReactElement {
  const [autoScroll, setAutoScroll] = useState(true)
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set())

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
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm gap-2 p-8">
        <Bug className="h-8 w-8 opacity-50" />
        <span>No logs yet. Logs will appear here during task execution.</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <span className="text-sm text-muted-foreground">
          {task.logs.length} log entries
        </span>
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
      <div className="flex-1 overflow-y-auto p-4 space-y-1 font-mono text-xs">
        {task.logs.map(log => {
          const config = LOG_LEVEL_CONFIG[log.level]
          const Icon = config.icon
          const isExpanded = expandedLogs.has(log.id)
          const hasDetails = !!log.details

          return (
            <div
              key={log.id}
              className={cn(
                'flex items-start gap-2 p-2 rounded hover:bg-muted/30',
                log.level === 'error' && 'bg-red-500/5',
                log.level === 'warning' && 'bg-amber-500/5'
              )}
            >
              <Icon className={cn('h-4 w-4 mt-0.5 flex-shrink-0', config.class)} />
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2 flex-wrap">
                  <span className="text-muted-foreground flex-shrink-0">
                    {formatTimestamp(log.timestamp)}
                  </span>
                  {log.phase && (
                    <Badge className="bg-muted text-muted-foreground">
                      {log.phase}
                    </Badge>
                  )}
                  <span className="text-muted-foreground break-words">
                    {log.message}
                  </span>
                </div>
                {hasDetails && (
                  <>
                    <button
                      type="button"
                      onClick={() => { toggleLogExpand(log.id); }}
                      className="flex items-center gap-1 mt-1 text-muted-foreground hover:text-foreground"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-3 w-3" />
                      ) : (
                        <ChevronRight className="h-3 w-3" />
                      )}
                      <span>Details</span>
                    </button>
                    {isExpanded && (
                      <pre className="mt-2 p-2 bg-muted rounded text-muted-foreground overflow-x-auto whitespace-pre-wrap">
                        {log.details}
                      </pre>
                    )}
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function HistoryTab({ task }: { task: KanbanTask }): ReactElement {
  if (task.statusHistory.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm gap-2 p-8">
        <Clock className="h-8 w-8 opacity-50" />
        <span>No history yet.</span>
      </div>
    )
  }

  return (
    <div className="p-4">
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-border" />

        {/* Timeline entries */}
        <div className="space-y-4">
          {task.statusHistory.map((entry, index) => {
            const toStyle = TASK_STATUS_STYLES[entry.toStatus]
            const isLatest = index === task.statusHistory.length - 1

            return (
              <div key={index} className="relative flex items-start gap-4 pl-6">
                {/* Timeline dot */}
                <div
                  className={cn(
                    'absolute left-0 w-3.5 h-3.5 rounded-full border-2 bg-background',
                    isLatest ? 'border-primary' : 'border-border'
                  )}
                />

                {/* Content */}
                <div className="flex-1 min-w-0 pb-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-muted-foreground">
                      {formatDate(entry.timestamp)}
                    </span>
                    {entry.agentId && (
                      <Badge className="bg-muted text-muted-foreground">
                        {entry.agentId}
                      </Badge>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    {entry.fromStatus && (
                      <>
                        <Badge className={cn(TASK_STATUS_STYLES[entry.fromStatus].bg, TASK_STATUS_STYLES[entry.fromStatus].text)}>
                          {TASK_STATUS_STYLES[entry.fromStatus].label}
                        </Badge>
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      </>
                    )}
                    <Badge className={cn(toStyle.bg, toStyle.text)}>
                      {toStyle.label}
                    </Badge>
                  </div>
                  {entry.reason && (
                    <p className="mt-1 text-sm text-muted-foreground">{entry.reason}</p>
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

export function DetailPanel({
  open,
  onClose,
  mode,
  feature,
  task,
  allTasks = [],
  onDeleteFeature,
  onUpdateFeature,
  onStartTask,
  onCancelTask,
  onRetryTask,
  onSkipTask,
  onReopenTask
}: DetailPanelProps): ReactElement | null {
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [isDeleting, setIsDeleting] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [_showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => { document.removeEventListener('keydown', handleKeyDown); }
  }, [open, onClose])

  // Reset state when panel closes
  useEffect(() => {
    if (!open) {
      setActiveTab('overview')
      setShowDeleteConfirm(false)
      setIsDeleting(false)
    }
  }, [open])

  // Get available tabs for current mode
  const availableTabs = TABS.filter(tab => tab.showFor.includes(mode))

  // Tab counts for task mode
  const tabCounts: Partial<Record<TabId, number>> = task ? {
    dependencies: task.dependsOn.length + allTasks.filter(t => t.dependsOn.includes(task.id)).length,
    files: task.filesToCreate.length + task.filesToModify.length,
    logs: task.logs.length,
    history: task.statusHistory.length
  } : {}

  // Task action states
  const canStart = task && (task.status === 'pending' || task.status === 'ready')
  const canCancel = task && (task.status === 'in-progress' || task.status === 'queued')
  const canRetry = task && task.status === 'failed'
  const canSkip = task && (task.status === 'failed' || task.status === 'blocked')
  const canReopen = task && (task.status === 'completed' || task.status === 'cancelled')
  const isBlocked = task ? (task.status === 'blocked' || task.blockedBy.length > 0) : false

  // Action handlers
  const handleAction = async (action: () => Promise<void> | void): Promise<void> => {
    setIsLoading(true)
    try {
      await action()
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteFeature = async (): Promise<void> => {
    if (!feature || !onDeleteFeature) return
    setIsDeleting(true)
    try {
      await onDeleteFeature(feature.id)
      onClose()
    } catch (error) {
      console.error('Failed to delete feature:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  // Get title based on mode
  const title = mode === 'feature' ? feature?.title : task?.title
  const _subtitle = mode === 'feature'
    ? feature && FEATURE_STATUS_LABELS[feature.status]
    : task && TASK_STATUS_STYLES[task.status].label

  // Don't render if no data
  if ((mode === 'feature' && !feature) || (mode === 'task' && !task)) {
    return null
  }

  // Panel content
  const panelContent = (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/20 transition-opacity duration-200',
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        data-testid="detail-panel"
        className={cn(
          'fixed top-0 right-0 z-50 h-full bg-background border-l border-border shadow-2xl',
          'flex flex-col',
          'transition-transform duration-200',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
        style={{
          width: PANEL_WIDTH,
          transitionTimingFunction: 'cubic-bezier(0.32, 0.72, 0, 1)'
        }}
      >
        {/* Header */}
        <div className="flex-shrink-0 p-4 border-b border-border">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {/* Status + Priority badges */}
              <div className="flex items-center gap-2 mb-2">
                {mode === 'feature' && feature && (
                  <>
                    <div className={cn('w-3 h-3 rounded-full', PRIORITY_COLORS[feature.priority])} />
                    <Badge className="bg-primary/20 text-primary">
                      {FEATURE_STATUS_LABELS[feature.status]}
                    </Badge>
                  </>
                )}
                {mode === 'task' && task && (
                  <>
                    <Badge className={cn(PRIORITY_COLORS[task.priority], 'text-white')}>
                      {PRIORITY_LABELS[task.priority]}
                    </Badge>
                    <Badge className={cn(TASK_STATUS_STYLES[task.status].bg, TASK_STATUS_STYLES[task.status].text)}>
                      {TASK_STATUS_STYLES[task.status].label}
                    </Badge>
                    {isBlocked && (
                      <Badge className="bg-red-500/20 text-red-400 flex items-center gap-1">
                        <Lock className="h-3 w-3" />
                        Blocked
                      </Badge>
                    )}
                  </>
                )}
              </div>
              {/* Title */}
              <h2 className="text-lg font-semibold text-foreground truncate">
                {title}
              </h2>
              {/* Assignee info */}
              {mode === 'feature' && feature?.assignedAgent && (
                <p className="text-sm text-muted-foreground mt-1">
                  Agent: {feature.assignedAgent}
                </p>
              )}
              {mode === 'task' && task?.assignedAgent && (
                <p className="text-sm text-muted-foreground mt-1">
                  Agent: {AGENT_LABELS[task.assignedAgent]}
                </p>
              )}
            </div>
            {/* Close button */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Progress bar for in-progress task */}
          {mode === 'task' && task && task.status === 'in-progress' && task.progress > 0 && (
            <div className="mt-3 flex items-center gap-3">
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all duration-300"
                  style={{ width: `${task.progress}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground tabular-nums w-10 text-right">
                {task.progress}%
              </span>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex-shrink-0 border-b border-border px-4">
          <div className="flex items-center gap-0 overflow-x-auto">
            {availableTabs.map(tab => (
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
          <ScrollArea className="h-full">
            {mode === 'feature' && feature && activeTab === 'overview' && (
              <FeatureOverviewTab
                feature={feature}
                onDelete={() => { void handleDeleteFeature(); }}
                onUpdate={onUpdateFeature}
                isDeleting={isDeleting}
              />
            )}
            {mode === 'task' && task && (
              <>
                {activeTab === 'overview' && <TaskOverviewTab task={task} />}
                {activeTab === 'dependencies' && <DependenciesTab task={task} allTasks={allTasks} />}
                {activeTab === 'files' && <FilesTab task={task} />}
                {activeTab === 'logs' && <LogsTab task={task} />}
                {activeTab === 'history' && <HistoryTab task={task} />}
              </>
            )}
          </ScrollArea>
        </div>

        {/* Footer Actions (Task mode only) */}
        {mode === 'task' && task && (
          <div className="flex-shrink-0 p-4 border-t border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              {canSkip && onSkipTask && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void handleAction(() => onSkipTask(task.id))}
                  disabled={isLoading}
                  className="text-muted-foreground hover:text-amber-400"
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
                  className="text-muted-foreground"
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Reopen
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
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
            </div>
          </div>
        )}
      </div>
    </>
  )

  // Use portal to render at document root
  return createPortal(panelContent, document.body)
}

export default DetailPanel
