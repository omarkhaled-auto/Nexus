/**
 * Kanban Column Configuration
 *
 * Defines the column structure for the Kanban board.
 * Used by KanbanBoard component to render columns.
 */

import type { FeatureStatus } from '../types/feature';

/**
 * Configuration for a single Kanban column
 */
export interface KanbanColumn {
  id: string;
  title: string;
  statuses: FeatureStatus[];  // Which feature statuses appear in this column
  wipLimit: number | null;    // Work in progress limit, null for unlimited
  color: string;              // Tailwind color class prefix (e.g., 'blue' for bg-blue-500)
  description?: string;       // Optional description for tooltip
}

/**
 * Default Kanban columns configuration
 * Maps to the 6-column layout defined in the requirements
 */
export const KANBAN_COLUMNS: KanbanColumn[] = [
  {
    id: 'backlog',
    title: 'Backlog',
    statuses: ['backlog'],
    wipLimit: null,
    color: 'slate',
    description: 'Features not yet started'
  },
  {
    id: 'planning',
    title: 'Planning',
    statuses: ['planning'],
    wipLimit: null,
    color: 'blue',
    description: 'Features being planned and decomposed into tasks'
  },
  {
    id: 'in_progress',
    title: 'In Progress',
    statuses: ['in_progress'],
    wipLimit: 3,
    color: 'amber',
    description: 'Features actively being worked on'
  },
  {
    id: 'ai_review',
    title: 'AI Review',
    statuses: ['ai_review'],
    wipLimit: null,
    color: 'violet',
    description: 'Features pending AI code review'
  },
  {
    id: 'human_review',
    title: 'Human Review',
    statuses: ['human_review'],
    wipLimit: null,
    color: 'purple',
    description: 'Features awaiting human approval'
  },
  {
    id: 'done',
    title: 'Done',
    statuses: ['done'],
    wipLimit: null,
    color: 'emerald',
    description: 'Completed features'
  }
];

/**
 * Color mapping for priority badges
 */
export const PRIORITY_COLORS: Record<string, string> = {
  critical: 'bg-red-500 text-white',
  high: 'bg-orange-500 text-white',
  medium: 'bg-yellow-500 text-black',
  low: 'bg-green-500 text-white'
};

/**
 * Color mapping for status badges
 */
export const STATUS_COLORS: Record<string, string> = {
  backlog: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  planning: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  in_progress: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  ai_review: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
  human_review: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  done: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  blocked: 'bg-red-500/20 text-red-300 border-red-500/30',
  failed: 'bg-red-500/20 text-red-300 border-red-500/30'
};

/**
 * Complexity labels for display
 */
export const COMPLEXITY_LABELS: Record<string, string> = {
  simple: 'S',
  moderate: 'M',
  complex: 'L'
};

/**
 * Full complexity display names
 */
export const COMPLEXITY_NAMES: Record<string, string> = {
  simple: 'Simple',
  moderate: 'Moderate',
  complex: 'Complex'
};

/**
 * Get color class for a column by ID
 */
export function getColumnColor(columnId: string): string {
  const column = KANBAN_COLUMNS.find(c => c.id === columnId);
  return column?.color ?? 'slate';
}

/**
 * Check if a column is at WIP limit
 */
export function isAtWipLimit(columnId: string, currentCount: number): boolean {
  const column = KANBAN_COLUMNS.find(c => c.id === columnId);
  if (!column?.wipLimit) return false;
  return currentCount >= column.wipLimit;
}

/**
 * Get the column for a given feature status
 */
export function getColumnForStatus(status: FeatureStatus): KanbanColumn | undefined {
  return KANBAN_COLUMNS.find(col => col.statuses.includes(status));
}
