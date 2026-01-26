import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@renderer/components/ui/dialog';
import { Button } from '@renderer/components/ui/button';
import { Download, Loader2, Trash2 } from 'lucide-react';
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

function formatLogEntry(log: LogEntry): string {
  const timestamp = new Date(log.timestamp).toLocaleTimeString();
  const prefix = log.type === 'error'
    ? 'ERROR'
    : log.type === 'warning'
      ? 'WARN'
      : log.type.toUpperCase();
  const details = log.details ? `\n  ${log.details}` : '';
  return `[${timestamp}] ${prefix} ${log.message}${details}`;
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
  const [logs, setLogs] = useState<string[]>([]);
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[760px]">
        <DialogHeader>
          <DialogTitle>{stepLabel} Logs</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {error && (
            <div className="rounded-md border border-accent-error/40 bg-accent-error/10 px-3 py-2 text-sm text-accent-error">
              {error}
            </div>
          )}

          <div
            ref={logContainerRef}
            className={cn(
              'max-h-[420px] overflow-auto rounded-lg border border-border-default',
              'bg-bg-dark px-4 py-3 font-mono text-xs text-text-secondary'
            )}
          >
            {isLoading && (
              <div className="flex items-center gap-2 text-text-secondary">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading logs...</span>
              </div>
            )}

            {!isLoading && logs.length === 0 && !error && (
              <div className="text-text-tertiary">No logs available for this step.</div>
            )}

            {!isLoading && logs.length > 0 && (
              <div className="space-y-1">
                {logs.map((line, index) => (
                  <div key={`${stepType}-log-${index}`} className="whitespace-pre-wrap leading-relaxed">
                    {line}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={() => void handleClearLogs()}>
            <Trash2 className="mr-2 h-4 w-4" />
            Clear Logs
          </Button>
          <Button variant="outline" size="sm" onClick={() => void handleExportLogs()}>
            <Download className="mr-2 h-4 w-4" />
            Export Logs
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
