import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@renderer/components/ui/dialog';
import { Button } from '@renderer/components/ui/button';
import { Download, Loader2, Trash2, Terminal, AlertCircle } from 'lucide-react';
import { cn } from '@renderer/lib/utils';
import { toast } from '@renderer/lib/toast';

// ============================================================================
// Types
// ============================================================================

interface LogEntry {
  id: string;
  timestamp: Date | string;
  type: 'build' | 'lint' | 'test' | 'review' | 'info' | 'error' | 'warning';
  message: string;
  details?: string;
  duration?: number;
}

export interface ExecutionLogViewerProps {
  stepType: 'build' | 'lint' | 'test' | 'review';
  isOpen: boolean;
  onClose: () => void;
}

// ============================================================================
// Helpers
// ============================================================================

function isElectronEnvironment(): boolean {
  return typeof window !== 'undefined' && typeof window.nexusAPI !== 'undefined';
}

function formatLogEntry(log: LogEntry): { text: string; type: string } {
  const timestamp = new Date(log.timestamp).toLocaleTimeString();
  const prefix = log.type === 'error'
    ? 'ERROR'
    : log.type === 'warning'
      ? 'WARN'
      : log.type.toUpperCase();
  const details = log.details ? `\n  ${log.details}` : '';
  return {
    text: `[${timestamp}] ${prefix} ${log.message}${details}`,
    type: log.type
  };
}

function downloadLogFile(content: string): void {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `nexus-execution-logs-${new Date().toISOString().slice(0, 10)}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ============================================================================
// Component
// ============================================================================

export function ExecutionLogViewer({ stepType, isOpen, onClose }: ExecutionLogViewerProps): ReactElement {
  const [logs, setLogs] = useState<Array<{ text: string; type: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const logContainerRef = useRef<HTMLDivElement | null>(null);

  const loadLogs = useCallback(async () => {
    if (!isElectronEnvironment()) {
      setError('Execution logs are only available in the desktop app.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const rawLogs = await window.nexusAPI.getExecutionLogs(stepType);
      const entries = Array.isArray(rawLogs) ? (rawLogs as LogEntry[]) : [];
      setLogs(entries.map(formatLogEntry));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load execution logs.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [stepType]);

  useEffect(() => {
    if (!isOpen) return;
    void loadLogs();
  }, [isOpen, loadLogs]);

  useEffect(() => {
    if (!isOpen || !isElectronEnvironment()) return;

    const unsubscribe = window.nexusAPI.onExecutionLogUpdate((data: { stepType: string; log: unknown }) => {
      if (data.stepType !== stepType) return;
      const logEntry = data.log as LogEntry;
      setLogs((prev) => [...prev, formatLogEntry(logEntry)]);
    });

    return () => {
      unsubscribe();
    };
  }, [isOpen, stepType]);

  useEffect(() => {
    if (!isOpen) return;
    const container = logContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [logs, isOpen]);

  const handleExportLogs = useCallback(async () => {
    if (!isElectronEnvironment()) {
      toast.error('Exporting logs requires the desktop app.');
      return;
    }

    try {
      const content = await window.nexusAPI.exportExecutionLogs();
      downloadLogFile(content);
      toast.success('Execution logs exported.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to export execution logs.';
      toast.error(message);
    }
  }, []);

  const handleClearLogs = useCallback(async () => {
    if (!isElectronEnvironment()) {
      toast.error('Clearing logs requires the desktop app.');
      return;
    }

    try {
      await window.nexusAPI.clearExecutionLogs();
      setLogs([]);
      toast.success('Execution logs cleared.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to clear execution logs.';
      toast.error(message);
    }
  }, []);

  const stepLabel = stepType.charAt(0).toUpperCase() + stepType.slice(1);

  // Determine log line styling based on type
  const getLogLineStyles = (type: string) => {
    switch (type) {
      case 'error':
        return 'border-l-red-500 bg-red-500/5 text-red-400';
      case 'warning':
        return 'border-l-amber-500 bg-amber-500/5 text-amber-400';
      case 'info':
        return 'border-l-[#30363D] text-[#8B949E]';
      default:
        return 'border-l-[#30363D] text-[#8B949E]';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[800px] bg-[#161B22] border-[#30363D]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-[#F0F6FC]">
            <div className="p-2 rounded-lg bg-[#7C3AED]/10">
              <Terminal className="w-5 h-5 text-[#7C3AED]" />
            </div>
            {stepLabel} Logs
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className={cn(
              'rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3',
              'flex items-center gap-3 text-sm text-red-400'
            )}>
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              {error}
            </div>
          )}

          <div
            ref={logContainerRef}
            className={cn(
              'max-h-[480px] overflow-auto rounded-xl border border-[#30363D]',
              'bg-[#0D1117] font-mono text-xs custom-scrollbar'
            )}
          >
            {isLoading && (
              <div className="flex items-center justify-center gap-3 py-12 text-[#8B949E]">
                <Loader2 className="h-5 w-5 animate-spin text-[#7C3AED]" />
                <span>Loading logs...</span>
              </div>
            )}

            {!isLoading && logs.length === 0 && !error && (
              <div className="flex flex-col items-center justify-center py-12 text-[#6E7681]">
                <Terminal className="w-10 h-10 mb-3 opacity-50" />
                <p className="text-sm">No logs available for this step.</p>
              </div>
            )}

            {!isLoading && logs.length > 0 && (
              <div className="p-3 space-y-0.5">
                {logs.map((log, index) => (
                  <div
                    key={`${stepType}-log-${index}`}
                    className={cn(
                      'flex items-start gap-3 py-1.5 px-3 rounded-md',
                      'border-l-2 transition-colors',
                      getLogLineStyles(log.type)
                    )}
                  >
                    <span className="w-8 text-right text-[#6E7681] shrink-0 select-none">
                      {index + 1}
                    </span>
                    <span className="whitespace-pre-wrap leading-relaxed">
                      {log.text}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleClearLogs()}
            className="border-[#30363D] text-[#8B949E] hover:text-[#F0F6FC] hover:bg-[#21262D]"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Clear Logs
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleExportLogs()}
            className="border-[#30363D] text-[#8B949E] hover:text-[#F0F6FC] hover:bg-[#21262D]"
          >
            <Download className="mr-2 h-4 w-4" />
            Export Logs
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
