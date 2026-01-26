/**
 * RecentProjectsList Component
 * Phase 21 Task 8: Display recently opened projects
 *
 * Features:
 * - List of up to 10 recent projects
 * - Click to open project
 * - Remove individual projects from list
 * - Clear all recent projects
 * - Loading state while fetching
 * - Empty state when no recent projects
 */

import { useState, useEffect, useCallback, type ReactElement } from 'react';
import { Button } from '@renderer/components/ui/button';
import { FolderOpen, Clock, X, Trash2, Loader2 } from 'lucide-react';
import { cn } from '@renderer/lib/utils';

/**
 * Recent project data structure
 */
interface RecentProject {
  path: string;
  name: string;
  lastOpened: string;
}

/**
 * Props for RecentProjectsList component
 */
interface RecentProjectsListProps {
  /** Callback when a project is selected */
  onSelect: (path: string, name: string) => void;
  /** Optional className for styling */
  className?: string;
  /** Maximum number of projects to display (default: 5) */
  maxDisplay?: number;
}

/**
 * Check if running in Electron environment with recentProjects API
 */
const hasRecentProjectsAPI = (): boolean => {
  return (
    typeof window !== 'undefined' &&
    typeof window.nexusAPI !== 'undefined' &&
    typeof window.nexusAPI.recentProjects !== 'undefined'
  );
};

/**
 * Format relative time from ISO date string
 */
function formatRelativeTime(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return date.toLocaleDateString();
  } catch {
    return 'Unknown';
  }
}

/**
 * Truncate path for display
 */
function truncatePath(path: string, maxLength: number = 50): string {
  if (path.length <= maxLength) return path;

  // Try to keep the end of the path (most relevant part)
  const parts = path.split(/[/\\]/);
  if (parts.length <= 2) {
    return '...' + path.slice(-maxLength + 3);
  }

  // Keep first and last parts
  const first = parts[0];
  const last = parts.slice(-2).join('/');
  const middle = '...';

  if (first.length + last.length + middle.length > maxLength) {
    return '...' + path.slice(-maxLength + 3);
  }

  return first + '/' + middle + '/' + last;
}

/**
 * RecentProjectsList - Display and manage recently opened projects
 */
export function RecentProjectsList({
  onSelect,
  className,
  maxDisplay = 5,
}: RecentProjectsListProps): ReactElement {
  const [projects, setProjects] = useState<RecentProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [removingPath, setRemovingPath] = useState<string | null>(null);

  /**
   * Fetch recent projects
   */
  const fetchProjects = useCallback(async () => {
    if (!hasRecentProjectsAPI()) {
      setIsLoading(false);
      return;
    }

    try {
      const recent = await window.nexusAPI.recentProjects.get();
      setProjects(recent.slice(0, maxDisplay));
    } catch (error) {
      console.error('Failed to fetch recent projects:', error);
    } finally {
      setIsLoading(false);
    }
  }, [maxDisplay]);

  /**
   * Load projects on mount
   */
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  /**
   * Handle project click
   */
  const handleSelect = (project: RecentProject): void => {
    onSelect(project.path, project.name);
  };

  /**
   * Handle remove project from recent list
   */
  const handleRemove = async (e: React.MouseEvent, path: string): Promise<void> => {
    e.stopPropagation(); // Prevent triggering select

    if (!hasRecentProjectsAPI()) return;

    setRemovingPath(path);
    try {
      await window.nexusAPI.recentProjects.remove(path);
      setProjects((prev) => prev.filter((p) => p.path !== path));
    } catch (error) {
      console.error('Failed to remove recent project:', error);
    } finally {
      setRemovingPath(null);
    }
  };

  /**
   * Handle clear all
   */
  const handleClearAll = async (): Promise<void> => {
    if (!hasRecentProjectsAPI()) return;

    try {
      await window.nexusAPI.recentProjects.clear();
      setProjects([]);
    } catch (error) {
      console.error('Failed to clear recent projects:', error);
    }
  };

  // Don't render if API not available
  if (!hasRecentProjectsAPI()) {
    return <></>;
  }

  // Loading state
  if (isLoading) {
    return (
      <div className={cn('py-4', className)} data-testid="recent-projects-loading">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading recent projects...</span>
        </div>
      </div>
    );
  }

  // Empty state
  if (projects.length === 0) {
    return (
      <div className={cn('py-4', className)} data-testid="recent-projects-empty">
        <div className="text-center py-6 text-muted-foreground">
          <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No recent projects</p>
          <p className="text-xs mt-1">Projects you open will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('py-2', className)} data-testid="recent-projects-list">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Recent Projects
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => { void handleClearAll(); }}
          className="text-xs text-muted-foreground hover:text-destructive h-7 px-2"
          data-testid="clear-all-btn"
        >
          <Trash2 className="h-3 w-3 mr-1" />
          Clear
        </Button>
      </div>

      <div className="space-y-1">
        {projects.map((project) => (
          <button
            key={project.path}
            onClick={() => { handleSelect(project); }}
            className={cn(
              'w-full text-left p-3 rounded-lg',
              'flex items-center gap-3 group',
              'bg-muted/30 hover:bg-muted/50',
              'border border-transparent hover:border-border',
              'transition-colors duration-150',
              removingPath === project.path && 'opacity-50 pointer-events-none'
            )}
            disabled={removingPath === project.path}
            data-testid={`recent-project-${project.name}`}
          >
            <div className="shrink-0 p-2 rounded-md bg-muted text-muted-foreground group-hover:text-foreground">
              <FolderOpen className="h-4 w-4" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="font-medium text-foreground truncate">
                {project.name}
              </div>
              <div className="text-xs text-muted-foreground truncate" title={project.path}>
                {truncatePath(project.path)}
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-2">
              <span className="text-xs text-muted-foreground hidden sm:block">
                {formatRelativeTime(project.lastOpened)}
              </span>

              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                onClick={(e) => { void handleRemove(e, project.path); }}
                disabled={removingPath === project.path}
                data-testid={`remove-${project.name}`}
              >
                {removingPath === project.path ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <X className="h-3 w-3" />
                )}
              </Button>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export default RecentProjectsList;
