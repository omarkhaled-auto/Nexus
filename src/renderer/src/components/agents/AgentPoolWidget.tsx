import { useCallback, useEffect, useState, type ReactElement } from 'react';
import { Activity, AlertTriangle, CheckCircle2, TrendingUp } from 'lucide-react';
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
  const healthColor = health === 'healthy'
    ? '#3FB950'
    : health === 'degraded'
      ? '#F0883E'
      : '#F85149';

  return (
    <div
      className={cn(
        'relative rounded-xl border overflow-hidden',
        'bg-[#161B22]/60 backdrop-blur-sm',
        'border-[#30363D]',
        'flex flex-col gap-4 p-5',
        className
      )}
    >
      {/* Gradient top border based on health */}
      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{
          background: `linear-gradient(to right, transparent, ${healthColor}50, transparent)`
        }}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-[#60A5FA]/10">
            <Activity className="h-4 w-4 text-[#60A5FA]" />
          </div>
          <h3 className="text-sm font-semibold text-[#F0F6FC]">Pool Utilization</h3>
        </div>
        <div
          className={cn(
            'flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full'
          )}
          style={{
            backgroundColor: `${healthColor}15`,
            color: healthColor
          }}
        >
          {health === 'healthy' ? (
            <CheckCircle2 className="h-3.5 w-3.5" />
          ) : (
            <AlertTriangle className="h-3.5 w-3.5" />
          )}
          <span>{healthLabel}</span>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-[#F85149]/30 bg-[#F85149]/10 px-3 py-2 text-xs text-[#F85149]">
          {error}
        </div>
      )}

      {isLoading && !error && (
        <div className="text-xs text-[#6E7681] flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#30363D] animate-pulse" />
          Loading pool status...
        </div>
      )}

      {!isLoading && !error && status && (
        <>
          {/* Utilization Stats */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-[#8B949E]">{activeAgents}/{maxAgents} agents active</span>
            </div>
            <div className="flex items-center gap-1.5">
              {utilization > 0 && (
                <TrendingUp className="h-3.5 w-3.5 text-[#60A5FA]" />
              )}
              <span className="text-sm font-semibold text-[#F0F6FC] tabular-nums">{utilization}%</span>
            </div>
          </div>

          {/* Progress Bar with gradient */}
          <div className="h-2 bg-[#21262D] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${utilization}%`,
                background: health === 'healthy'
                  ? 'linear-gradient(to right, #3FB950, #2EA043)'
                  : health === 'degraded'
                    ? 'linear-gradient(to right, #F0883E, #D29922)'
                    : 'linear-gradient(to right, #F85149, #DA3633)'
              }}
            />
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className={cn(
              "rounded-lg px-3 py-2",
              "bg-[#21262D]/60 border border-[#30363D]"
            )}>
              <div className="text-xs text-[#6E7681] mb-0.5">Idle</div>
              <div className="text-lg font-semibold text-[#8B949E] tabular-nums">{status.idle}</div>
            </div>
            <div className={cn(
              "rounded-lg px-3 py-2",
              "bg-[#60A5FA]/5 border border-[#60A5FA]/20"
            )}>
              <div className="text-xs text-[#6E7681] mb-0.5">Working</div>
              <div className="text-lg font-semibold text-[#60A5FA] tabular-nums">{status.working}</div>
            </div>
            <div className={cn(
              "rounded-lg px-3 py-2",
              status.error > 0
                ? "bg-[#F85149]/5 border border-[#F85149]/20"
                : "bg-[#21262D]/60 border border-[#30363D]"
            )}>
              <div className="text-xs text-[#6E7681] mb-0.5">Errors</div>
              <div className={cn(
                "text-lg font-semibold tabular-nums",
                status.error > 0 ? "text-[#F85149]" : "text-[#8B949E]"
              )}>{status.error}</div>
            </div>
          </div>

          {/* Tasks in Progress indicator */}
          {status.tasksInProgress > 0 && (
            <div className="flex items-center justify-between pt-2 border-t border-[#30363D]">
              <span className="text-xs text-[#6E7681]">Tasks in progress</span>
              <span className="text-sm font-medium text-[#60A5FA] tabular-nums">{status.tasksInProgress}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
