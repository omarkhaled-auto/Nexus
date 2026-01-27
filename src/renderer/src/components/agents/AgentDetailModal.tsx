import { useCallback, useEffect, useState, type ReactElement } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@renderer/components/ui/dialog';
import { Button } from '@renderer/components/ui/button';
import { cn } from '@renderer/lib/utils';
import {
  Loader2,
  AlertTriangle,
  Bot,
  Code,
  Eye,
  TestTube,
  GitMerge,
  Clock,
  Zap,
  Hash,
  FileCode,
  CheckCircle2,
  XCircle,
  Activity
} from 'lucide-react';
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

// Agent type configuration with colors
const agentTypeConfig: Record<AgentData['type'], {
  icon: typeof Bot;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
}> = {
  planner: {
    icon: Bot,
    label: 'Planner',
    color: 'text-[#7C3AED]',
    bgColor: 'bg-[#7C3AED]/10',
    borderColor: 'border-[#7C3AED]/20'
  },
  coder: {
    icon: Code,
    label: 'Coder',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20'
  },
  reviewer: {
    icon: Eye,
    label: 'Reviewer',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/20'
  },
  tester: {
    icon: TestTube,
    label: 'Tester',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/20'
  },
  merger: {
    icon: GitMerge,
    label: 'Merger',
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/10',
    borderColor: 'border-pink-500/20'
  },
};

// Status configuration
const statusConfig: Record<AgentData['status'], { label: string; color: string; bgColor: string }> = {
  idle: { label: 'Idle', color: 'text-[#8B949E]', bgColor: 'bg-[#21262D]' },
  working: { label: 'Working', color: 'text-blue-400', bgColor: 'bg-blue-500/10' },
  waiting: { label: 'Waiting', color: 'text-amber-400', bgColor: 'bg-amber-500/10' },
  error: { label: 'Error', color: 'text-red-400', bgColor: 'bg-red-500/10' },
};

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

  const typeConfig = agent ? agentTypeConfig[agent.type] : null;
  const AgentIcon = typeConfig?.icon ?? Bot;
  const agentStatus = agent ? statusConfig[agent.status] : null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className={cn(
        "sm:max-w-[760px] p-0 overflow-hidden",
        "bg-[#161B22]/95 backdrop-blur-xl",
        "border border-[#30363D]",
        "shadow-[0_24px_48px_rgba(0,0,0,0.5),0_0_30px_rgba(124,58,237,0.1)]",
        "rounded-2xl"
      )}>
        {/* Header */}
        <DialogHeader className="relative px-6 pt-6 pb-4 border-b border-[#30363D]/50">
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#7C3AED]/30 to-transparent" />

          <div className="flex items-center gap-4">
            {typeConfig && (
              <div className={cn(
                "relative p-3 rounded-xl border",
                typeConfig.bgColor,
                typeConfig.borderColor
              )}>
                <AgentIcon className={cn("h-6 w-6", typeConfig.color)} />
                <div className={cn("absolute inset-0 blur-xl rounded-xl", typeConfig.bgColor)} />
              </div>
            )}

            <div className="flex-1">
              <DialogTitle className="text-lg font-semibold text-[#F0F6FC]">
                {typeConfig?.label ?? 'Agent'} Details
              </DialogTitle>
              {agentStatus && (
                <div className={cn(
                  "inline-flex items-center gap-1.5 mt-1.5 px-2 py-0.5 rounded text-xs font-medium",
                  agentStatus.bgColor,
                  agentStatus.color
                )}>
                  {agent?.status === 'working' && (
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-400"></span>
                    </span>
                  )}
                  {agentStatus.label}
                </div>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="px-6 py-5 max-h-[60vh] overflow-y-auto space-y-5">
          {error && (
            <div className={cn(
              "flex items-center gap-2 p-3 rounded-lg",
              "bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
            )}>
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-3 text-[#8B949E]">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Loading agent details...</span>
              </div>
            </div>
          )}

          {!isLoading && agent && (
            <>
              {/* Agent Info Card */}
              <div className={cn(
                "p-4 rounded-xl border",
                typeConfig?.bgColor ?? 'bg-[#21262D]/50',
                typeConfig?.borderColor ?? 'border-[#30363D]/50'
              )}>
                <div className="grid gap-3 text-sm">
                  <div className="flex items-center gap-3">
                    <Hash className="h-4 w-4 text-[#8B949E]" />
                    <span className="text-[#8B949E]">Agent ID</span>
                    <code className="ml-auto text-sm font-mono text-[#F0F6FC] bg-[#0D1117] px-2 py-0.5 rounded">
                      {agent.id}
                    </code>
                  </div>
                  <div className="flex items-center gap-3">
                    <AgentIcon className={cn("h-4 w-4", typeConfig?.color ?? 'text-[#8B949E]')} />
                    <span className="text-[#8B949E]">Type</span>
                    <span className={cn("ml-auto text-sm font-medium", typeConfig?.color)}>
                      {typeConfig?.label ?? 'Unknown'}
                    </span>
                  </div>
                  {agent.model && (
                    <div className="flex items-center gap-3">
                      <Zap className="h-4 w-4 text-[#8B949E]" />
                      <span className="text-[#8B949E]">Model</span>
                      <span className="ml-auto text-sm text-[#F0F6FC]">{agent.model}</span>
                    </div>
                  )}
                  {agent.currentFile && (
                    <div className="flex items-center gap-3">
                      <FileCode className="h-4 w-4 text-[#8B949E]" />
                      <span className="text-[#8B949E]">Current File</span>
                      <code className="ml-auto text-xs font-mono text-[#F0F6FC] bg-[#0D1117] px-2 py-0.5 rounded truncate max-w-[300px]">
                        {agent.currentFile}
                      </code>
                    </div>
                  )}
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Current Task */}
                <div className="p-4 rounded-xl bg-[#0D1117]/50 border border-[#30363D]/50">
                  <p className="text-xs uppercase tracking-wider text-[#8B949E] flex items-center gap-2 mb-3">
                    <Activity className="h-3.5 w-3.5" />
                    Current Task
                  </p>
                  {agent.currentTask ? (
                    <div className="space-y-2">
                      <div className="text-sm text-[#F0F6FC] font-medium">{agent.currentTask.name}</div>
                      <code className="text-xs font-mono text-[#8B949E] bg-[#21262D] px-2 py-0.5 rounded">
                        {agent.currentTask.id}
                      </code>
                      {typeof agent.currentTask.progress === 'number' && (
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs">
                            <span className="text-[#8B949E]">Progress</span>
                            <span className="text-[#7C3AED] font-medium">
                              {Math.round(agent.currentTask.progress * 100)}%
                            </span>
                          </div>
                          <div className="h-1.5 bg-[#21262D] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-[#7C3AED] to-[#A855F7] rounded-full transition-all duration-300"
                              style={{ width: `${agent.currentTask.progress * 100}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-[#8B949E]">No active task</p>
                  )}
                </div>

                {/* Performance */}
                <div className="p-4 rounded-xl bg-[#0D1117]/50 border border-[#30363D]/50">
                  <p className="text-xs uppercase tracking-wider text-[#8B949E] flex items-center gap-2 mb-3">
                    <Zap className="h-3.5 w-3.5" />
                    Performance
                  </p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-[#8B949E]">Tasks completed</span>
                      <span className="text-emerald-400 font-medium">{tasksCompleted}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#8B949E]">Avg duration</span>
                      <span className="text-[#F0F6FC] font-mono">{formatDuration(avgDuration)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#8B949E]">Tokens used</span>
                      <span className="text-[#F0F6FC] font-mono">
                        {agent.metrics?.tokensUsed?.toLocaleString() ?? 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Task History */}
              <div className="p-4 rounded-xl bg-[#0D1117]/50 border border-[#30363D]/50">
                <p className="text-xs uppercase tracking-wider text-[#8B949E] flex items-center gap-2 mb-3">
                  <Clock className="h-3.5 w-3.5" />
                  Task History
                </p>
                {taskHistory.length === 0 ? (
                  <p className="text-sm text-[#8B949E]">No history available.</p>
                ) : (
                  <ul className="space-y-2 max-h-[200px] overflow-y-auto">
                    {taskHistory.map((task) => {
                      const isCompleted = task.status === 'completed';
                      const isFailed = task.status === 'failed' || !!task.error;
                      return (
                        <li
                          key={task.id}
                          className={cn(
                            "p-3 rounded-lg border transition-colors",
                            isFailed
                              ? "bg-red-500/5 border-red-500/20"
                              : isCompleted
                                ? "bg-emerald-500/5 border-emerald-500/20"
                                : "bg-[#21262D]/50 border-[#30363D]/50"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {isFailed ? (
                                <XCircle className="h-4 w-4 text-red-400" />
                              ) : isCompleted ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                              ) : (
                                <Clock className="h-4 w-4 text-[#8B949E]" />
                              )}
                              <span className="text-sm text-[#F0F6FC]">{task.name}</span>
                            </div>
                            <span className="text-xs font-mono text-[#8B949E]">
                              {formatDuration(task.duration)}
                            </span>
                          </div>
                          {task.error && (
                            <p className="mt-2 text-xs text-red-400 pl-6">{task.error}</p>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {/* Error Log */}
              <div className={cn(
                "p-4 rounded-xl border",
                errorLog.length > 0
                  ? "bg-red-500/5 border-red-500/20"
                  : "bg-[#0D1117]/50 border-[#30363D]/50"
              )}>
                <p className={cn(
                  "text-xs uppercase tracking-wider flex items-center gap-2 mb-3",
                  errorLog.length > 0 ? "text-red-400" : "text-[#8B949E]"
                )}>
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Error Log {errorLog.length > 0 && `(${errorLog.length})`}
                </p>
                {errorLog.length === 0 ? (
                  <p className="text-sm text-[#8B949E]">No errors reported.</p>
                ) : (
                  <ul className="space-y-2 max-h-[150px] overflow-y-auto">
                    {errorLog.map((entry, index) => (
                      <li
                        key={`${agent.id}-error-${index}`}
                        className="text-sm text-red-400 p-2 rounded bg-red-500/10 border border-red-500/20"
                      >
                        {entry}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t border-[#30363D]/50 bg-[#0D1117]/30">
          <Button
            variant="outline"
            onClick={onClose}
            className={cn(
              "bg-[#21262D] border-[#30363D]",
              "hover:bg-[#30363D] hover:border-[#30363D]",
              "text-[#F0F6FC]"
            )}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
