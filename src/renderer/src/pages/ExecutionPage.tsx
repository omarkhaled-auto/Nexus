import type { ReactElement } from 'react';
import { Header } from '@renderer/components/layout/Header';
import { Terminal, Trash2, Download, CheckCircle, XCircle, Loader2, AlertTriangle, AlertCircle } from 'lucide-react';
import { Button } from '@renderer/components/ui/button';
import { useState, useEffect, useCallback } from 'react';
import { cn } from '@renderer/lib/utils';
import { useCheckpoint } from '@renderer/hooks/useCheckpoint';
import { ReviewModal } from '@renderer/components/checkpoints/ReviewModal';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if running in Electron environment
 */
function isElectronEnvironment(): boolean {
  return typeof window !== 'undefined' && typeof window.nexusAPI !== 'undefined';
}

/**
 * Log entry interface from backend
 */
interface LogEntry {
  id: string;
  timestamp: Date;
  type: 'build' | 'lint' | 'test' | 'review' | 'info' | 'error' | 'warning';
  message: string;
  details?: string;
  duration?: number;
}

/**
 * Convert backend log entries to display strings
 */
function convertLogsToStrings(logs: LogEntry[]): string[] {
  if (!logs || logs.length === 0) {
    return [];
  }
  return logs.map(log => {
    const timestamp = new Date(log.timestamp).toLocaleTimeString();
    const prefix = log.type === 'error' ? '✗' : log.type === 'warning' ? '⚠' : '•';
    const details = log.details ? `\n  ${log.details}` : '';
    return `[${timestamp}] ${prefix} ${log.message}${details}`;
  });
}

// ============================================================================
// Types
// ============================================================================

type TabId = 'build' | 'lint' | 'test' | 'review';
type TabStatus = 'pending' | 'running' | 'success' | 'error';

interface LogTab {
  id: TabId;
  label: string;
  status: TabStatus;
  count?: number;
  duration?: number;
  logs: string[];
}

// Default tabs (used when no data from backend yet)
const defaultTabs: LogTab[] = [
  { id: 'build', label: 'Build', status: 'pending', logs: [] },
  { id: 'lint', label: 'Lint', status: 'pending', logs: [] },
  { id: 'test', label: 'Test', status: 'pending', logs: [] },
  { id: 'review', label: 'Review', status: 'pending', logs: [] },
];

// ============================================================================
// Tab Button Component
// ============================================================================

interface TabButtonProps {
  tab: LogTab;
  isActive: boolean;
  onClick: () => void;
}

function TabButton({ tab, isActive, onClick }: TabButtonProps): ReactElement {
  const getStatusIcon = () => {
    switch (tab.status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-accent-success" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-accent-error" />;
      case 'running':
        return <Loader2 className="w-4 h-4 text-accent-primary animate-spin" />;
      default:
        return <div className="w-4 h-4 rounded-full bg-bg-hover" />;
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg',
        'transition-colors border-b-2',
        isActive
          ? 'text-text-primary border-accent-primary bg-bg-card'
          : 'text-text-secondary border-transparent hover:text-text-primary hover:bg-bg-hover'
      )}
      data-testid={`execution-tab-${tab.id}`}
    >
      {getStatusIcon()}
      <span>{tab.label}</span>
      {tab.count !== undefined && (
        <span
          className={cn(
            'px-1.5 py-0.5 text-xs rounded',
            tab.status === 'error' ? 'bg-accent-error/20 text-accent-error' : 'bg-bg-hover text-text-secondary'
          )}
        >
          {tab.count}
        </span>
      )}
      {tab.duration && (
        <span className="text-xs text-text-tertiary">{(tab.duration / 1000).toFixed(1)}s</span>
      )}
    </button>
  );
}

// ============================================================================
// Log Viewer Component
// ============================================================================

interface LogViewerProps {
  logs: string[];
  status: TabStatus;
}

function LogViewer({ logs, status }: LogViewerProps): ReactElement {
  return (
    <div
      className={cn(
        'flex-1 bg-bg-dark rounded-lg border border-border-default overflow-auto',
        'font-mono text-sm'
      )}
      data-testid="log-viewer"
    >
      <div className="p-4 space-y-0.5">
        {logs.map((line, index) => (
          <div
            key={index}
            className={cn(
              'flex items-start gap-3 leading-relaxed',
              line.startsWith('$') && 'text-accent-secondary font-semibold',
              line.includes('error') && 'text-accent-error',
              line.includes('warning') && 'text-accent-warning',
              (line.includes('') || line.includes('passed') || line.includes('success')) &&
                'text-accent-success',
              !line.startsWith('$') &&
                !line.includes('error') &&
                !line.includes('warning') &&
                !line.includes('') &&
                !line.includes('passed') &&
                !line.includes('success') &&
                'text-text-secondary'
            )}
          >
            <span className="w-8 text-right text-text-tertiary shrink-0 select-none">
              {index + 1}
            </span>
            <span className="whitespace-pre-wrap">{line || ' '}</span>
          </div>
        ))}

        {/* Running indicator */}
        {status === 'running' && (
          <div className="flex items-center gap-3 mt-4 text-accent-primary">
            <span className="w-8" />
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="animate-pulse">Running...</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// ExecutionPage Component
// ============================================================================

/**
 * Execution Page - View build, lint, test, and review logs.
 *
 * Displays:
 * - Tab navigation for different QA stages
 * - Syntax-highlighted log output
 * - Status indicators and durations
 * - Clear and export actions
 *
 * Connects to real backend data via IPC when running in Electron.
 */
export default function ExecutionPage(): ReactElement {
  const [activeTab, setActiveTab] = useState<TabId>('build');
  const [tabs, setTabs] = useState<LogTab[]>(defaultTabs);
  const [currentTaskName, setCurrentTaskName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Human review state
  const {
    pendingReviews,
    activeReview,
    loadPendingReviews,
    selectReview,
    approveReview,
    rejectReview,
  } = useCheckpoint();

  // Load real data from backend
  const loadRealData = useCallback(async () => {
    if (!isElectronEnvironment()) {
      setError('Backend not available. Please run in Electron.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const status = await window.nexusAPI.getExecutionStatus();

      if (status && status.steps) {
        const newTabs: LogTab[] = status.steps.map(step => ({
          id: step.type,
          label: step.type.charAt(0).toUpperCase() + step.type.slice(1),
          status: step.status,
          count: step.count,
          duration: step.duration,
          logs: convertLogsToStrings(step.logs as LogEntry[])
        }));

        setTabs(newTabs);
        setCurrentTaskName(status.currentTaskName);
      } else {
        // No status from backend - show empty default tabs
        setTabs(defaultTabs);
      }
    } catch (err) {
      console.error('Failed to load execution status:', err);
      setError(err instanceof Error ? err.message : 'Failed to load execution status');
      // Keep current tabs (default empty) on error
    } finally {
      setLoading(false);
    }
  }, []);

  // Subscribe to real-time updates
  const subscribeToEvents = useCallback(() => {
    if (!isElectronEnvironment()) return () => {};

    const unsubscribeLog = window.nexusAPI.onExecutionLogUpdate((data: { stepType: string; log: unknown }) => {
      setTabs(prevTabs => prevTabs.map(tab => {
        if (tab.id === data.stepType) {
          const logEntry = data.log as LogEntry;
          const newLogLine = `[${new Date(logEntry.timestamp).toLocaleTimeString()}] ${logEntry.message}`;
          return { ...tab, logs: [...tab.logs, newLogLine] };
        }
        return tab;
      }));
    });

    const unsubscribeStatus = window.nexusAPI.onExecutionStatusChange((data: { stepType: string; status: string }) => {
      setTabs(prevTabs => prevTabs.map(tab => {
        if (tab.id === data.stepType) {
          return { ...tab, status: data.status as TabStatus };
        }
        return tab;
      }));
    });

    return () => {
      unsubscribeLog();
      unsubscribeStatus();
    };
  }, []);

  // Initial load and event subscription
  useEffect(() => {
    void loadRealData();
    const unsubscribe = subscribeToEvents();

    let interval: NodeJS.Timeout | null = null;
    if (isElectronEnvironment()) {
      interval = setInterval(() => void loadRealData(), 5000);
    }

    return () => {
      unsubscribe();
      if (interval) clearInterval(interval);
    };
  }, [loadRealData, subscribeToEvents]);

  // Human review: Load pending reviews on mount and periodically
  useEffect(() => {
    if (!isElectronEnvironment()) return;

    void loadPendingReviews();
    const reviewInterval = setInterval(() => void loadPendingReviews(), 5000);

    return () => clearInterval(reviewInterval);
  }, [loadPendingReviews]);

  // Human review: Subscribe to review:requested events
  useEffect(() => {
    if (!isElectronEnvironment()) return;

    const unsubscribe = window.nexusAPI.onNexusEvent?.((event: { type: string }) => {
      if (event.type === 'review:requested' || event.type === 'task:escalated') {
        void loadPendingReviews();
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [loadPendingReviews]);

  const activeTabData = tabs.find((t) => t.id === activeTab) || tabs[0];

  const handleClearLogs = async () => {
    if (isElectronEnvironment()) {
      try {
        await window.nexusAPI.clearExecutionLogs();
      } catch (err) {
        console.error('Failed to clear logs:', err);
      }
    }
    setTabs(tabs.map(tab => ({ ...tab, status: 'pending', count: undefined, duration: undefined, logs: [] })));
  };

  const handleExportLogs = async () => {
    let content = '';
    if (isElectronEnvironment()) {
      try {
        content = await window.nexusAPI.exportExecutionLogs();
      } catch (err) {
        console.error('Failed to export logs:', err);
        return;
      }
    } else {
      // Non-Electron: export current tab data as-is
      content = `Nexus Execution Logs\nGenerated: ${new Date().toISOString()}\n${'='.repeat(60)}\n\n`;
      for (const tab of tabs) {
        content += `## ${tab.label.toUpperCase()} [${tab.status.toUpperCase()}]\n`;
        if (tab.duration) content += `Duration: ${(tab.duration / 1000).toFixed(2)}s\n`;
        content += `${'-'.repeat(40)}\n${tab.logs.length > 0 ? tab.logs.join('\n') : 'No logs available'}\n\n`;
      }
    }

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nexus-execution-logs-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-screen" data-testid="execution-page">
      {/* Header */}
      <Header
        title="Execution Logs"
        subtitle={currentTaskName ? `Current task: ${currentTaskName}` : 'No active task'}
        icon={Terminal}
        showBack
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void handleExportLogs()}
              data-testid="export-logs-button"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void handleClearLogs()}
              data-testid="clear-logs-button"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear
            </Button>
          </div>
        }
      />

      {/* Error Banner */}
      {error && (
        <div className="mx-6 mt-4 px-4 py-3 bg-accent-error/10 border border-accent-error/30 rounded-lg flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-accent-error" />
          <span className="text-sm text-accent-error">{error}</span>
        </div>
      )}

      {/* Human Review Required Banner */}
      {pendingReviews.length > 0 && (
        <div className="mx-6 mt-4 px-4 py-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            <span className="text-sm text-amber-200">
              {pendingReviews.length} task{pendingReviews.length > 1 ? 's' : ''} need{pendingReviews.length === 1 ? 's' : ''} human review
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => selectReview(pendingReviews[0])}
            className="border-amber-500/50 text-amber-200 hover:bg-amber-500/20"
          >
            Review Now
          </Button>
        </div>
      )}

      {/* Human Review Modal */}
      <ReviewModal
        review={activeReview}
        onApprove={approveReview}
        onReject={rejectReview}
        onClose={() => selectReview(null)}
      />

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center flex-1">
          <Loader2 className="w-8 h-8 text-accent-primary animate-spin" />
        </div>
      )}

      {/* Main Content */}
      {!loading && (
        <div className="flex-1 flex flex-col p-6 min-h-0">
          {/* Tab Navigation */}
          <div
            className="flex items-center gap-1 border-b border-border-default shrink-0"
            role="tablist"
            data-testid="execution-tabs"
          >
            {tabs.map((tab) => (
              <TabButton
                key={tab.id}
                tab={tab}
                isActive={activeTab === tab.id}
                onClick={() => { setActiveTab(tab.id); }}
              />
            ))}
          </div>

          {/* Log Output */}
          <div className="flex-1 mt-4 min-h-0 flex flex-col">
            <LogViewer logs={activeTabData.logs} status={activeTabData.status} />
          </div>

          {/* Summary Bar */}
          <div
            className="flex items-center justify-between mt-4 px-4 py-3 bg-bg-card rounded-lg border border-border-default shrink-0"
            data-testid="execution-summary"
          >
            <div className="flex items-center gap-4">
              {tabs.map((tab) => (
                <div key={tab.id} className="flex items-center gap-2 text-sm">
                  <span
                    className={cn(
                      'w-2 h-2 rounded-full',
                      tab.status === 'success' && 'bg-accent-success',
                      tab.status === 'error' && 'bg-accent-error',
                      tab.status === 'running' && 'bg-accent-primary animate-pulse',
                      tab.status === 'pending' && 'bg-text-tertiary'
                    )}
                  />
                  <span className="text-text-secondary">{tab.label}</span>
              </div>
            ))}
          </div>
          <div className="text-sm text-text-tertiary">
            Total Duration:{' '}
            {(tabs.reduce((acc, t) => acc + (t.duration || 0), 0) / 1000).toFixed(1)}s
          </div>
        </div>
        </div>
      )}
    </div>
  );
}
