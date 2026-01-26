import { useCallback, useEffect, useState, type ReactElement } from 'react';
import { Activity, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Progress } from '@renderer/components/ui/Progress';
import { cn } from '@renderer/lib/utils';

interface AgentPoolStatusResponse {
  totalAgents: number;
  maxAgents: number;
  working: number;
  idle: number;
  error: number;
  complete: number;
  tasksInProgress: number;
}

export interface AgentPoolWidgetProps {
  className?: string;
}

function isElectronEnvironment(): boolean {
  return typeof window !== 'undefined' && typeof window.nexusAPI !== 'undefined';
}

export function AgentPoolWidget({ className }: AgentPoolWidgetProps): ReactElement {
  const [status, setStatus] = useState<AgentPoolStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    if (!isElectronEnvironment()) {
      setError('Agent pool status requires the desktop app.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await window.nexusAPI.getAgentPoolStatus();
      setStatus(response as AgentPoolStatusResponse);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load agent pool status.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // FIX #6: Use event-driven updates instead of polling
  useEffect(() => {
    void loadStatus(); // Initial load

    if (!isElectronEnvironment()) return;

    // Subscribe to agent events for real-time updates
    const unsubscribers: (() => void)[] = [];

    // Update when agent status changes
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- onAgentStatus may be undefined in non-Electron context
    if (window.nexusAPI?.onAgentStatus) {
      unsubscribers.push(window.nexusAPI.onAgentStatus(() => {
        void loadStatus();
      }));
    }

    // Update when new agent is created
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- onAgentCreated may be undefined in non-Electron context
    if (window.nexusAPI?.onAgentCreated) {
      unsubscribers.push(window.nexusAPI.onAgentCreated(() => {
        void loadStatus();
      }));
    }

    // Fallback polling at 30 seconds (reduced from 5s) for edge cases
    const interval = setInterval(() => {
      void loadStatus();
    }, 30000);

    return () => {
      unsubscribers.forEach((unsub) => { unsub(); });
      clearInterval(interval);
    };
  }, [loadStatus]);

  const maxAgents = status?.maxAgents ?? 0;
  const activeAgents = status?.working ?? 0;
  const utilization = maxAgents > 0 ? Math.round((activeAgents / maxAgents) * 100) : 0;

  const health = (() => {
    if (status && status.error > 0) return 'degraded';
    if (utilization >= 90) return 'overloaded';
    return 'healthy';
  })();

  const healthLabel = health === 'healthy' ? 'Healthy' : health === 'degraded' ? 'Degraded' : 'Overloaded';
  const healthClass = health === 'healthy'
    ? 'text-accent-success'
    : health === 'degraded'
      ? 'text-accent-warning'
      : 'text-accent-error';

  return (
    <div
      className={cn(
        'rounded-lg border border-border-default bg-bg-card p-4',
        'flex flex-col gap-3',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-text-secondary" />
          <h3 className="text-sm font-semibold text-text-primary">Pool Utilization</h3>
        </div>
        <div className={cn('flex items-center gap-1 text-xs font-medium', healthClass)}>
          {health === 'healthy' ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          <span>{healthLabel}</span>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-accent-error/40 bg-accent-error/10 px-3 py-2 text-xs text-accent-error">
          {error}
        </div>
      )}

      {isLoading && !error && (
        <div className="text-xs text-text-tertiary">Loading pool status...</div>
      )}

      {!isLoading && !error && status && (
        <>
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-secondary">{activeAgents}/{maxAgents} agents active</span>
            <span className="text-text-tertiary">{utilization}%</span>
          </div>
          <Progress value={utilization} max={100} size="sm" variant={health === 'healthy' ? 'success' : health === 'degraded' ? 'warning' : 'error'} />
          <div className="grid grid-cols-3 gap-3 text-xs text-text-secondary">
            <div className="rounded-md bg-bg-muted/60 px-2 py-1">
              <div className="text-text-tertiary">Idle</div>
              <div className="text-text-primary">{status.idle}</div>
            </div>
            <div className="rounded-md bg-bg-muted/60 px-2 py-1">
              <div className="text-text-tertiary">Working</div>
              <div className="text-text-primary">{status.working}</div>
            </div>
            <div className="rounded-md bg-bg-muted/60 px-2 py-1">
              <div className="text-text-tertiary">Errors</div>
              <div className="text-text-primary">{status.error}</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
