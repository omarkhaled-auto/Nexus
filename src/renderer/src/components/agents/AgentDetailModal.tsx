import { useCallback, useEffect, useState, type ReactElement } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@renderer/components/ui/dialog';
import { Button } from '@renderer/components/ui/button';
import { Loader2 } from 'lucide-react';
import type { AgentData } from './AgentCard';

export interface AgentDetailModalProps {
  agentId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

interface AgentTaskHistoryEntry {
  id: string;
  name: string;
  status?: string;
  duration?: number;
  error?: string;
}

function getNexusAPI(): Window['nexusAPI'] | null {
  const globalWindow = globalThis as typeof globalThis & { nexusAPI?: Window['nexusAPI'] };
  return globalWindow.nexusAPI ?? null;
}

function formatDuration(ms?: number): string {
  if (!ms) return 'N/A';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

function normalizeAgent(agent: Record<string, unknown>): AgentData {
  return {
    id: typeof agent.id === 'string' ? agent.id : 'unknown',
    type: typeof agent.type === 'string' ? (agent.type as AgentData['type']) : 'coder',
    status: typeof agent.status === 'string' ? (agent.status as AgentData['status']) : 'idle',
    model: typeof agent.model === 'string' ? agent.model : undefined,
    currentTask: agent.currentTask as AgentData['currentTask'] | undefined,
    iteration: agent.iteration as AgentData['iteration'] | undefined,
    metrics: agent.metrics as AgentData['metrics'] | undefined,
    currentFile: typeof agent.currentFile === 'string' ? agent.currentFile : undefined,
  };
}

function parseTaskHistory(history: unknown): AgentTaskHistoryEntry[] {
  if (!Array.isArray(history)) return [];
  return history
    .map((entry) => {
      const record = entry as Record<string, unknown>;
      return {
        id: typeof record.id === 'string' ? record.id : 'unknown',
        name: typeof record.name === 'string'
          ? record.name
          : typeof record.taskName === 'string'
            ? record.taskName
            : 'Untitled task',
        status: typeof record.status === 'string' ? record.status : undefined,
        duration: typeof record.duration === 'number' ? record.duration : undefined,
        error: typeof record.error === 'string' ? record.error : undefined,
      };
    });
}

function parseErrorLog(agent: Record<string, unknown>): string[] {
  const errors: string[] = [];

  if (Array.isArray(agent.errorLog)) {
    errors.push(...agent.errorLog.filter((item): item is string => typeof item === 'string'));
  }

  if (Array.isArray(agent.errors)) {
    errors.push(...agent.errors.filter((item): item is string => typeof item === 'string'));
  }

  if (typeof agent.error === 'string') {
    errors.push(agent.error);
  }

  if (typeof agent.lastError === 'string') {
    errors.push(agent.lastError);
  }

  return errors;
}

export function AgentDetailModal({ agentId, isOpen, onClose }: AgentDetailModalProps): ReactElement {
  const [agentRecord, setAgentRecord] = useState<Record<string, unknown> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAgent = useCallback(async () => {
    if (!agentId) return;
    const nexusAPI = getNexusAPI();
    if (!nexusAPI) {
      setError('Agent details require the desktop app.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await nexusAPI.getAgent(agentId);
      if (!response) {
        setError('Agent not found.');
        setAgentRecord(null);
        return;
      }
      setAgentRecord(response as Record<string, unknown>);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load agent details.';
      setError(message);
      setAgentRecord(null);
    } finally {
      setIsLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    if (!isOpen) {
      setAgentRecord(null);
      setError(null);
      return;
    }

    void loadAgent();
  }, [isOpen, loadAgent]);

  const agent = agentRecord ? normalizeAgent(agentRecord) : null;
  const taskHistory = agentRecord ? parseTaskHistory(agentRecord.taskHistory) : [];
  const errorLog = agentRecord ? parseErrorLog(agentRecord) : [];

  const tasksCompleted = typeof agentRecord?.tasksCompleted === 'number'
    ? agentRecord.tasksCompleted
    : taskHistory.length;
  const durations = taskHistory
    .map((entry) => entry.duration)
    .filter((value): value is number => typeof value === 'number');
  const avgDuration = durations.length > 0
    ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length)
    : undefined;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[720px]">
        <DialogHeader>
          <DialogTitle>Agent Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="rounded-md border border-accent-error/40 bg-accent-error/10 px-3 py-2 text-sm text-accent-error">
              {error}
            </div>
          )}

          {isLoading && (
            <div className="flex items-center gap-2 text-text-secondary">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading agent details...</span>
            </div>
          )}

          {!isLoading && agent && (
            <div className="space-y-4">
              <div className="grid gap-3 rounded-lg border border-border-default bg-bg-muted/50 p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-text-tertiary">Agent ID:</span>
                  <span className="font-mono text-text-secondary">{agent.id}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-text-tertiary">Type:</span>
                  <span className="text-text-secondary capitalize">{agent.type}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-text-tertiary">Status:</span>
                  <span className="text-text-secondary capitalize">{agent.status}</span>
                </div>
                {agent.model && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-text-tertiary">Model:</span>
                    <span className="text-text-secondary">{agent.model}</span>
                  </div>
                )}
                {agent.currentFile && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-text-tertiary">Current File:</span>
                    <span className="font-mono text-text-secondary">{agent.currentFile}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-border-default bg-bg-muted/50 p-3">
                  <p className="text-xs uppercase text-text-tertiary">Current Task</p>
                  {agent.currentTask ? (
                    <div className="mt-2 space-y-1 text-sm">
                      <div className="text-text-primary">{agent.currentTask.name}</div>
                      <div className="text-text-tertiary">ID: {agent.currentTask.id}</div>
                      {typeof agent.currentTask.progress === 'number' && (
                        <div className="text-text-tertiary">Progress: {Math.round(agent.currentTask.progress * 100)}%</div>
                      )}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-text-tertiary">No active task</p>
                  )}
                </div>

                <div className="rounded-lg border border-border-default bg-bg-muted/50 p-3">
                  <p className="text-xs uppercase text-text-tertiary">Performance</p>
                  <div className="mt-2 space-y-1 text-sm text-text-secondary">
                    <div>Tasks completed: {tasksCompleted}</div>
                    <div>Avg duration: {formatDuration(avgDuration)}</div>
                    <div>Tokens used: {agent.metrics?.tokensUsed ?? 'N/A'}</div>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-border-default bg-bg-muted/50 p-3">
                <p className="text-xs uppercase text-text-tertiary">Task History</p>
                {taskHistory.length === 0 ? (
                  <p className="mt-2 text-sm text-text-tertiary">No history available.</p>
                ) : (
                  <ul className="mt-2 space-y-2 text-sm">
                    {taskHistory.map((task) => (
                      <li key={task.id} className="rounded-md border border-border-default bg-bg-card p-2">
                        <div className="flex items-center justify-between">
                          <span className="text-text-primary">{task.name}</span>
                          <span className="text-text-tertiary">{formatDuration(task.duration)}</span>
                        </div>
                        <div className="text-xs text-text-tertiary">{task.status ?? 'unknown'}</div>
                        {task.error && (
                          <div className="mt-1 text-xs text-accent-error">{task.error}</div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded-lg border border-border-default bg-bg-muted/50 p-3">
                <p className="text-xs uppercase text-text-tertiary">Error Log</p>
                {errorLog.length === 0 ? (
                  <p className="mt-2 text-sm text-text-tertiary">No errors reported.</p>
                ) : (
                  <ul className="mt-2 space-y-1 text-sm text-accent-error">
                    {errorLog.map((entry, index) => (
                      <li key={`${agent.id}-error-${index}`}>{entry}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
