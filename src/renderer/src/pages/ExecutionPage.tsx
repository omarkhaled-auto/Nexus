import type { ReactElement } from 'react';
import { Header } from '@renderer/components/layout/Header';
import {
  Terminal,
  Trash2,
  Download,
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
  AlertCircle,
  Search,
  Filter,
  Play,
  Clock,
  Zap,
} from 'lucide-react';
import { Button } from '@renderer/components/ui/button';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { cn } from '@renderer/lib/utils';
import { useCheckpoint } from '@renderer/hooks/useCheckpoint';
import { ReviewModal } from '@renderer/components/checkpoints/ReviewModal';
import { ExecutionLogViewer } from '@renderer/components/execution/ExecutionLogViewer';

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
  if (logs.length === 0) {
    return [];
  }
  return logs.map(log => {
    const timestamp = new Date(log.timestamp).toLocaleTimeString();
    const prefix = log.type === 'error' ? 'ERROR' : log.type === 'warning' ? 'WARN' : 'INFO';
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

// Tab icons
const tabIcons: Record<TabId, typeof Terminal> = {
  build: Zap,
  lint: Filter,
  test: Play,
  review: CheckCircle,
};

// ============================================================================
// Tab Button Component
// ============================================================================

interface TabButtonProps {
  tab: LogTab;
  isActive: boolean;
  onClick: () => void;
}

function TabButton({ tab, isActive, onClick }: TabButtonProps): ReactElement {
  const Icon = tabIcons[tab.id];

  const getStatusIndicator = () => {
    switch (tab.status) {
      case 'success':
        return <div className="w-2 h-2 rounded-full bg-[#10B981]" />;
      case 'error':
        return <div className="w-2 h-2 rounded-full bg-red-500" />;
      case 'running':
        return <div className="w-2 h-2 rounded-full bg-[#7C3AED] animate-pulse" />;
      default:
        return <div className="w-2 h-2 rounded-full bg-[#6E7681]" />;
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium',
        'transition-all duration-200',
        isActive
          ? 'bg-[#21262D] text-[#F0F6FC] shadow-lg shadow-black/20'
          : 'text-[#8B949E] hover:text-[#F0F6FC] hover:bg-[#21262D]/50'
      )}
      data-testid={`execution-tab-${tab.id}`}
    >
      {getStatusIndicator()}
      <Icon className="w-4 h-4" />
      <span>{tab.label}</span>
      {tab.count !== undefined && tab.count > 0 && (
        <span
          className={cn(
            'px-1.5 py-0.5 text-xs rounded-md',
            tab.status === 'error' ? 'bg-red-500/20 text-red-400' : 'bg-[#30363D] text-[#8B949E]'
          )}
        >
          {tab.count}
        </span>
      )}
      {tab.duration !== undefined && tab.duration > 0 && (
        <span className="text-xs text-[#6E7681] flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {(tab.duration / 1000).toFixed(1)}s
        </span>
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
  autoScroll?: boolean;
}

function LogViewer({ logs, status, autoScroll = true }: LogViewerProps): ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  // Determine log line type for styling
  const getLogLineType = (line: string): 'error' | 'warning' | 'success' | 'info' | 'command' => {
    const lowerLine = line.toLowerCase();
    if (line.startsWith('$') || line.startsWith('>')) return 'command';
    if (lowerLine.includes('error') || line.includes('ERROR')) return 'error';
    if (lowerLine.includes('warning') || line.includes('WARN')) return 'warning';
    if (lowerLine.includes('passed') || lowerLine.includes('success') || line.includes('OK')) return 'success';
    return 'info';
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        'flex-1 bg-[#0D1117] rounded-xl border border-[#30363D] overflow-auto',
        'font-mono text-sm'
      )}
      data-testid="log-viewer"
    >
      <div className="p-4 space-y-0.5">
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-[#6E7681]">
            <Terminal className="w-12 h-12 mb-4 opacity-50" />
            <p className="text-sm">No logs yet</p>
            <p className="text-xs mt-1">Logs will appear here when execution starts</p>
          </div>
        ) : (
          logs.map((line, index) => {
            const type = getLogLineType(line);
            return (
              <div
                key={index}
                className={cn(
                  'flex items-start gap-3 py-1 px-3 rounded-md',
                  'border-l-2 transition-colors',
                  type === 'error' && 'border-l-red-500 bg-red-500/5 text-red-400',
                  type === 'warning' && 'border-l-amber-500 bg-amber-500/5 text-amber-400',
                  type === 'success' && 'border-l-[#10B981] bg-[#10B981]/5 text-[#10B981]',
                  type === 'command' && 'border-l-[#7C3AED] bg-[#7C3AED]/5 text-[#7C3AED] font-semibold',
                  type === 'info' && 'border-l-[#30363D] text-[#8B949E]'
                )}
              >
                <span className="w-8 text-right text-[#6E7681] shrink-0 select-none text-xs leading-6">
                  {index + 1}
                </span>
                <span className="whitespace-pre-wrap leading-6">{line || ' '}</span>
              </div>
            );
          })
        )}

        {/* Running indicator */}
        {status === 'running' && (
          <div className="flex items-center gap-3 mt-4 px-3 py-2 text-[#7C3AED] border-l-2 border-l-[#7C3AED] bg-[#7C3AED]/5 rounded-md">
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
 * Design: Linear/Raycast-inspired with modern tabs, syntax-highlighted logs,
 * and glassmorphism effects.
 */
export default function ExecutionPage(): ReactElement {
  const [activeTab, setActiveTab] = useState<TabId>('build');
  const [tabs, setTabs] = useState<LogTab[]>(defaultTabs);
  const [currentTaskName, setCurrentTaskName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logViewerStep, setLogViewerStep] = useState<TabId | null>(null);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [showErrorsOnly, setShowErrorsOnly] = useState(false);

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
    } catch (err) {
      console.error('Failed to load execution status:', err);
      setError(err instanceof Error ? err.message : 'Failed to load execution status');
    } finally {
      setLoading(false);
    }
  }, []);

  // Subscribe to real-time updates
  const subscribeToEvents = useCallback(() => {
    if (!isElectronEnvironment()) return () => {};

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- nexusAPI can be undefined in edge cases
    if (!window.nexusAPI) return () => {};

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

    return () => { clearInterval(reviewInterval); };
  }, [loadPendingReviews]);

  // Human review: Subscribe to review:requested events
  useEffect(() => {
    if (!isElectronEnvironment()) return;

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- nexusAPI can be undefined in edge cases
    if (!window.nexusAPI) return;

    const unsubscribe = window.nexusAPI.onNexusEvent((event: { type: string }) => {
      if (event.type === 'review:requested' || event.type === 'task:escalated') {
        void loadPendingReviews();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [loadPendingReviews]);

  const activeTabData = tabs.find((t) => t.id === activeTab) || tabs[0];

  // Filter logs based on search query and error filter
  const filteredLogs = useMemo(() => {
    let logs = activeTabData.logs;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      logs = logs.filter(line => line.toLowerCase().includes(query));
    }

    if (showErrorsOnly) {
      logs = logs.filter(line =>
        line.toLowerCase().includes('error') ||
        line.includes('ERROR') ||
        line.toLowerCase().includes('failed') ||
        line.toLowerCase().includes('failure')
      );
    }

    return logs;
  }, [activeTabData.logs, searchQuery, showErrorsOnly]);

  const handleClearLogs = async () => {
    if (isElectronEnvironment()) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- nexusAPI can be undefined in edge cases
        await window.nexusAPI?.clearExecutionLogs();
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
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- nexusAPI can be undefined in edge cases
        content = await window.nexusAPI?.exportExecutionLogs() ?? '';
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

  // Calculate total stats
  const totalDuration = tabs.reduce((acc, t) => acc + (t.duration || 0), 0);
  const hasErrors = tabs.some(t => t.status === 'error');
  const isRunning = tabs.some(t => t.status === 'running');
  const allSuccess = tabs.every(t => t.status === 'success' || t.status === 'pending');

  return (
    <div className="flex flex-col h-screen bg-[#0D1117] relative overflow-hidden" data-testid="execution-page">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-mesh opacity-10 pointer-events-none" />

      {/* Header */}
      <Header
        title="Execution Logs"
        subtitle={currentTaskName ? `Current task: ${currentTaskName}` : 'No active task'}
        icon={Terminal}
        showBack
        actions={
          <div className="flex items-center gap-2">
            {pendingReviews.length > 0 && (
              <button
                type="button"
                onClick={() => { selectReview(pendingReviews[0]); }}
                className={cn(
                  'flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-medium',
                  'border border-amber-500/40 bg-amber-500/10 text-amber-300',
                  'hover:bg-amber-500/20 transition-colors'
                )}
              >
                <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                {pendingReviews.length} Review{pendingReviews.length === 1 ? '' : 's'}
              </button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void handleExportLogs()}
              className="text-[#8B949E] hover:text-[#F0F6FC] hover:bg-[#21262D]"
              data-testid="export-logs-button"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void handleClearLogs()}
              className="text-[#8B949E] hover:text-[#F0F6FC] hover:bg-[#21262D]"
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
        <div className="mx-6 mt-4 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3 animate-fade-in-up">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <span className="text-sm text-red-400">{error}</span>
        </div>
      )}

      {/* Human Review Required Banner */}
      {pendingReviews.length > 0 && (
        <div className="mx-6 mt-4 px-4 py-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between animate-fade-in-up">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20">
              <AlertCircle className="w-5 h-5 text-amber-400" />
            </div>
            <span className="text-sm text-amber-200">
              {pendingReviews.length} task{pendingReviews.length > 1 ? 's' : ''} need{pendingReviews.length === 1 ? 's' : ''} human review
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => { selectReview(pendingReviews[0]); }}
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
        onClose={() => { selectReview(null); }}
      />

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center flex-1">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 text-[#7C3AED] animate-spin" />
            <span className="text-sm text-[#8B949E]">Loading execution status...</span>
          </div>
        </div>
      )}

      {/* Main Content */}
      {!loading && (
        <div className="relative z-10 flex-1 flex flex-col p-6 min-h-0">
          {/* Tab Navigation */}
          <div
            className="flex items-center gap-2 p-1.5 bg-[#161B22]/80 backdrop-blur-sm rounded-2xl border border-[#30363D] shrink-0 mb-4"
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

          {/* Search and Filter Controls */}
          <div className="flex items-center gap-4 mb-4 shrink-0">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6E7681]" />
              <input
                type="text"
                placeholder="Search logs..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); }}
                className={cn(
                  'w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#30363D] bg-[#161B22]',
                  'text-sm text-[#F0F6FC] placeholder:text-[#6E7681]',
                  'focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/50 focus:border-[#7C3AED]/50',
                  'transition-all'
                )}
                data-testid="log-search-input"
              />
            </div>
            <label className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-xl cursor-pointer',
              'bg-[#161B22] border border-[#30363D]',
              'hover:bg-[#21262D] transition-colors',
              showErrorsOnly && 'border-red-500/50 bg-red-500/10'
            )}>
              <input
                type="checkbox"
                checked={showErrorsOnly}
                onChange={(e) => { setShowErrorsOnly(e.target.checked); }}
                className="w-4 h-4 rounded border-[#30363D] bg-[#0D1117] text-red-500 focus:ring-red-500"
                data-testid="errors-only-checkbox"
              />
              <span className={cn(
                'text-sm',
                showErrorsOnly ? 'text-red-400' : 'text-[#8B949E]'
              )}>Errors only</span>
            </label>
            {(searchQuery || showErrorsOnly) && (
              <span className="text-xs text-[#6E7681]">
                Showing {filteredLogs.length} of {activeTabData.logs.length} lines
              </span>
            )}
          </div>

          {/* Log Output */}
          <div className="flex-1 min-h-0 flex flex-col">
            <LogViewer logs={filteredLogs} status={activeTabData.status} autoScroll={!searchQuery && !showErrorsOnly} />
          </div>

          {/* Summary Bar */}
          <div
            className="flex items-center justify-between mt-4 px-5 py-4 bg-[#161B22]/80 backdrop-blur-sm rounded-2xl border border-[#30363D] shrink-0"
            data-testid="execution-summary"
          >
            <div className="flex flex-wrap items-center gap-6">
              {tabs.map((tab) => (
                <div key={tab.id} className="flex items-center gap-2.5 text-sm">
                  <span
                    className={cn(
                      'w-2.5 h-2.5 rounded-full',
                      tab.status === 'success' && 'bg-[#10B981]',
                      tab.status === 'error' && 'bg-red-500',
                      tab.status === 'running' && 'bg-[#7C3AED] animate-pulse',
                      tab.status === 'pending' && 'bg-[#6E7681]'
                    )}
                  />
                  <span className="text-[#8B949E]">{tab.label}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2.5 text-xs text-[#8B949E] hover:text-[#F0F6FC] hover:bg-[#21262D]"
                    onClick={() => { setLogViewerStep(tab.id); }}
                  >
                    View
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-4">
              {/* Status indicator */}
              <div className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium',
                isRunning && 'bg-[#7C3AED]/10 text-[#7C3AED]',
                hasErrors && !isRunning && 'bg-red-500/10 text-red-400',
                allSuccess && !isRunning && 'bg-[#10B981]/10 text-[#10B981]'
              )}>
                {isRunning && <Loader2 className="w-3 h-3 animate-spin" />}
                {hasErrors && !isRunning && <XCircle className="w-3 h-3" />}
                {allSuccess && !isRunning && <CheckCircle className="w-3 h-3" />}
                <span>
                  {isRunning ? 'Running' : hasErrors ? 'Failed' : 'Complete'}
                </span>
              </div>

              <div className="text-sm text-[#6E7681] flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                Total: {(totalDuration / 1000).toFixed(1)}s
              </div>
            </div>
          </div>
        </div>
      )}

      <ExecutionLogViewer
        stepType={logViewerStep ?? 'build'}
        isOpen={logViewerStep !== null}
        onClose={() => { setLogViewerStep(null); }}
      />
    </div>
  );
}
