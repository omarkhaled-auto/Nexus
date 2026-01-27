import type { ReactElement } from 'react';
import { Header } from '@renderer/components/layout/Header';
import { Bot, Play, Pause, RefreshCw, AlertCircle, Cpu } from 'lucide-react';
import { Button } from '@renderer/components/ui/button';
import { Alert, AlertDescription } from '@renderer/components/ui/Alert';
import { Spinner } from '@renderer/components/ui/Spinner';
import {
  AgentPoolStatus,
  AgentPoolWidget,
  AgentCard,
  AgentDetailModal,
  AgentActivity,
  QAStatusPanel,
  type AgentData,
  type PoolAgent,
  type QAStep,
} from '@renderer/components/agents';
import { useState, useEffect, useCallback } from 'react';
import { cn } from '@renderer/lib/utils';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if we are running in Electron environment with nexusAPI available
 */
function isElectronEnvironment(): boolean {
  return typeof window !== 'undefined' && Boolean((window as Window & { nexusAPI?: typeof window.nexusAPI }).nexusAPI);
}

/**
 * Map backend agent data to frontend AgentData format
 */
function mapBackendAgent(agent: unknown): AgentData {
  const a = agent as Record<string, unknown>;
  const type = a.type as AgentData['type'] | undefined;
  const status = a.status as AgentData['status'] | undefined;
  return {
    id: (a.id as string) || 'unknown',
    type: type ?? 'coder',
    status: status ?? 'idle',
    model: a.model as string | undefined,
    currentTask: a.currentTask as AgentData['currentTask'] | undefined,
    iteration: a.iteration as AgentData['iteration'] | undefined,
    metrics: a.metrics as AgentData['metrics'] | undefined,
    currentFile: a.currentFile as string | undefined,
  };
}

/**
 * Map backend QA status to frontend QAStep format
 */
function mapQAStatus(qaStatus: unknown): QAStep[] {
  const defaultSteps: QAStep[] = [
    { type: 'build', status: 'pending' },
    { type: 'lint', status: 'pending' },
    { type: 'test', status: 'pending' },
    { type: 'review', status: 'pending' },
  ];
  if (!qaStatus) return defaultSteps;
  const qa = qaStatus as { steps?: unknown[] };
  if (qa.steps && Array.isArray(qa.steps)) {
    return qa.steps.map((step: unknown) => {
      const s = step as Record<string, unknown>;
      const type = s.type as QAStep['type'] | undefined;
      const status = s.status as QAStep['status'] | undefined;
      return {
        type: type ?? 'build',
        status: status ?? 'pending',
        duration: s.duration as number | undefined,
        error: s.error as string | undefined,
        testCounts: s.testCounts as QAStep['testCounts'] | undefined,
      };
    });
  }
  return defaultSteps;
}

// Default QA steps (used when no data from backend yet)
const defaultQASteps: QAStep[] = [
  { type: 'build', status: 'pending' },
  { type: 'lint', status: 'pending' },
  { type: 'test', status: 'pending' },
  { type: 'review', status: 'pending' },
];

// Agent type colors for gradient borders and glows
const agentTypeColors: Record<string, { border: string; glow: string; bg: string }> = {
  planner: { border: '#A78BFA', glow: 'rgba(167, 139, 250, 0.3)', bg: 'rgba(167, 139, 250, 0.1)' },
  coder: { border: '#60A5FA', glow: 'rgba(96, 165, 250, 0.3)', bg: 'rgba(96, 165, 250, 0.1)' },
  tester: { border: '#34D399', glow: 'rgba(52, 211, 153, 0.3)', bg: 'rgba(52, 211, 153, 0.1)' },
  reviewer: { border: '#FBBF24', glow: 'rgba(251, 191, 36, 0.3)', bg: 'rgba(251, 191, 36, 0.1)' },
  architect: { border: '#F472B6', glow: 'rgba(244, 114, 182, 0.3)', bg: 'rgba(244, 114, 182, 0.1)' },
  debugger: { border: '#F87171', glow: 'rgba(248, 113, 113, 0.3)', bg: 'rgba(248, 113, 113, 0.1)' },
};

// ============================================================================
// AgentsPage Component
// ============================================================================

/**
 * Agents Page - Real-time monitoring of AI agent activity.
 *
 * Features:
 * - Agent pool visualization with type-specific colors
 * - Status animations (working spinner, error shake)
 * - Glassmorphism card design
 * - Real-time QA pipeline status
 */
export default function AgentsPage(): ReactElement {
  // State for agents and UI - initialized empty, loaded from backend
  const [agents, setAgents] = useState<AgentData[]>([]);
  const [qaSteps, setQASteps] = useState<QAStep[]>(defaultQASteps);
  const [iteration, setIteration] = useState<{ current: number; max: number }>({ current: 0, max: 50 });
  const [agentOutput, setAgentOutput] = useState<string[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [detailAgentId, setDetailAgentId] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // Start loading
  const [error, setError] = useState<string | null>(null);

  // Get selected agent from current agents state
  const selectedAgent = agents.find((a) => a.id === selectedAgentId);

  // Load real data from backend API
  const loadRealData = useCallback(async () => {
    if (!isElectronEnvironment()) {
      setError('Backend not available. Please run in Electron.');
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const api = window.nexusAPI;
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- api can be undefined in non-Electron context
      if (!api) return;
      const [agentsData, qaStatusData] = await Promise.all([
        api.getAgents(),
        api.getQAStatus(),
      ]);
      // Set agents (empty array if none)
      if (Array.isArray(agentsData)) {
        setAgents(agentsData.map(mapBackendAgent));
        // Auto-select first agent if none selected
        if (agentsData.length > 0 && !selectedAgentId) {
          setSelectedAgentId((agentsData[0] as { id: string }).id);
        }
      }
      // Set QA status
      if (qaStatusData) {
        const qa = qaStatusData as { iteration?: number; maxIterations?: number };
        setQASteps(mapQAStatus(qaStatusData));
        if (qa.iteration !== undefined && qa.maxIterations !== undefined) {
          setIteration({ current: qa.iteration, max: qa.maxIterations });
        }
      }
      // Load output for selected agent
      if (selectedAgentId) {
        try {
          const output = await api.getAgentOutput(selectedAgentId);
          if (Array.isArray(output)) setAgentOutput(output);
        } catch { /* Ignore output fetch errors */ }
      }
    } catch (err) {
      console.error('Failed to load agent data:', err);
      setError('Failed to load agent data from backend.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedAgentId]);

  // Subscribe to real-time events
  const subscribeToEvents = useCallback(() => {
    if (!isElectronEnvironment()) return () => {};
    const api = window.nexusAPI;
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- api can be undefined in non-Electron context
    if (!api) return () => {};
    const unsubscribers: (() => void)[] = [];
    unsubscribers.push(api.onAgentStatus((status) => {
      const s = status as { id?: string; agentId?: string } & Record<string, unknown>;
      const agentId = s.id || s.agentId;
      if (agentId) {
        const statusValue = s.status as AgentData['status'] | undefined
        setAgents((prev) => prev.map((a) => a.id === agentId ? { ...a, status: statusValue ?? a.status } : a));
      }
    }));
    unsubscribers.push(api.onAgentOutput((data) => {
      if (data.agentId === selectedAgentId) setAgentOutput((prev) => [...prev, data.line]);
    }));
    unsubscribers.push(api.onQAStatusUpdate((status) => {
      setQASteps(mapQAStatus(status));
      const qa = status as { iteration?: number; maxIterations?: number };
      if (qa.iteration !== undefined && qa.maxIterations !== undefined) setIteration({ current: qa.iteration, max: qa.maxIterations });
    }));

    // FIX #5: Subscribe to agent created events for dynamic discovery
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- onAgentCreated may be undefined in non-Electron context
    if (api.onAgentCreated) {
      unsubscribers.push(api.onAgentCreated((agent: unknown) => {
        const newAgent = mapBackendAgent(agent);
        setAgents((prev) => {
          // Avoid duplicates
          if (prev.some((a) => a.id === newAgent.id)) {
            return prev;
          }
          return [...prev, newAgent];
        });
        // Auto-select the new agent if none is selected
        setSelectedAgentId((current) => current ?? newAgent.id);
      }));
    }

    return () => { unsubscribers.forEach((unsub) => { unsub(); }); };
  }, [selectedAgentId]);

  // Load data and subscribe to events on mount
  useEffect(() => {
    void loadRealData();
    const cleanup = subscribeToEvents();
    return cleanup;
  }, [loadRealData, subscribeToEvents]);

  // Event handlers
  const handlePauseAll = async () => {
    setIsPaused((prev) => !prev);
    if (isElectronEnvironment()) {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- nexusAPI can be undefined in edge cases
      try { await window.nexusAPI?.pauseExecution(isPaused ? 'user_resume' : 'user_pause'); }
      catch (err) { console.error('Failed to pause/resume:', err); }
    }
  };

  const handleRefresh = () => { void loadRealData(); };

  const handleAgentSelect = (agentId: string) => {
    setSelectedAgentId(agentId);
    setAgentOutput([]); // Clear previous output
    if (isElectronEnvironment()) {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- nexusAPI can be undefined in edge cases
      void window.nexusAPI?.getAgentOutput(agentId).then((output) => {
        if (Array.isArray(output)) setAgentOutput(output);
      }).catch(() => {
        // Keep empty output on error
      });
    }
  };

  const handleAgentDetailOpen = (agentId: string) => {
    handleAgentSelect(agentId);
    setDetailAgentId(agentId);
  };

  // Prepare pool agents for display
  const poolAgents: PoolAgent[] = agents.map((a) => ({ id: a.id, type: a.type, status: a.status, taskName: a.currentTask?.name }));

  // Calculate agent stats
  const workingCount = agents.filter((a) => a.status === 'working').length;
  const idleCount = agents.filter((a) => a.status === 'idle').length;
  const errorCount = agents.filter((a) => a.status === 'error').length;

  return (
    <div className="flex flex-col h-screen bg-[#0D1117]" data-testid="agents-page">
      {/* Background effects */}
      <div className="fixed inset-0 bg-gradient-mesh opacity-20 pointer-events-none" />
      <div className="fixed top-1/4 right-0 w-[500px] h-[500px] bg-[#60A5FA]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 left-1/4 w-[400px] h-[400px] bg-[#A78BFA]/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <Header
        title="Agent Activity"
        subtitle="Real-time monitoring"
        icon={Bot}
        showBack
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
              data-testid="refresh-agents-button"
              className={cn(
                "border-[#30363D] text-[#8B949E]",
                "hover:bg-[#21262D] hover:border-[#484F58]",
                "transition-all duration-200"
              )}
            >
              <RefreshCw className={cn(
                "w-4 h-4 mr-2",
                isLoading && "animate-spin"
              )} />
              Refresh
            </Button>
            <Button
              variant={isPaused ? 'primary' : 'outline'}
              size="sm"
              onClick={() => { void handlePauseAll(); }}
              data-testid="pause-all-button"
              className={cn(
                isPaused
                  ? "bg-gradient-to-r from-[#7C3AED] to-[#A855F7] text-white"
                  : "border-[#30363D] text-[#8B949E] hover:bg-[#21262D]"
              )}
            >
              {isPaused ? (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Resume All
                </>
              ) : (
                <>
                  <Pause className="w-4 h-4 mr-2" />
                  Pause All
                </>
              )}
            </Button>
          </div>
        }
      />

      {/* Error Banner */}
      {error && (
        <div className="px-6 pt-4 relative z-10">
          <Alert variant="warning" dismissible onDismiss={() => { setError(null); }}>
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center p-4 relative z-10">
          <Spinner size="sm" className="mr-2" />
          <span className="text-[#8B949E]">Loading agent data...</span>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-hidden p-6 relative z-10">
        <div className="h-full flex flex-col gap-6">
          {/* Agent Pool Overview Card */}
          <div className={cn(
            "shrink-0 rounded-xl p-6",
            "bg-[#161B22]/60 backdrop-blur-sm",
            "border border-[#30363D]"
          )}>
            {/* Gradient top border */}
            <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-[#60A5FA]/50 to-transparent" />

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#60A5FA]/20 to-[#60A5FA]/5">
                  <Cpu className="h-5 w-5 text-[#60A5FA]" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[#F0F6FC]">Agent Pool</h2>
                  <p className="text-sm text-[#8B949E]">{agents.length} agents registered</p>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-[#60A5FA] tabular-nums">{workingCount}</div>
                  <div className="text-xs text-[#8B949E]">Working</div>
                </div>
                <div className="w-px h-8 bg-[#30363D]" />
                <div className="text-center">
                  <div className="text-2xl font-bold text-[#8B949E] tabular-nums">{idleCount}</div>
                  <div className="text-xs text-[#8B949E]">Idle</div>
                </div>
                <div className="w-px h-8 bg-[#30363D]" />
                <div className="text-center">
                  <div className="text-2xl font-bold text-[#F85149] tabular-nums">{errorCount}</div>
                  <div className="text-xs text-[#8B949E]">Errors</div>
                </div>
              </div>
            </div>

            {/* Agent Pool Visualization */}
            <div className="flex flex-wrap gap-2">
              {agents.map((agent) => {
                const colors = agentTypeColors[agent.type] || agentTypeColors.coder;
                return (
                  <button
                    key={agent.id}
                    onClick={() => handleAgentSelect(agent.id)}
                    className={cn(
                      "relative px-3 py-2 rounded-lg",
                      "border transition-all duration-300",
                      "flex items-center gap-2",
                      selectedAgentId === agent.id
                        ? "border-[#7C3AED] bg-[#7C3AED]/10"
                        : "border-[#30363D] hover:border-[#484F58] bg-[#21262D]/50",
                      agent.status === 'working' && "animate-pulse",
                      agent.status === 'error' && "animate-shake"
                    )}
                    style={{
                      borderColor: selectedAgentId === agent.id ? colors.border : undefined,
                      boxShadow: agent.status === 'working' ? `0 0 15px ${colors.glow}` : undefined
                    }}
                  >
                    {/* Status indicator */}
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      agent.status === 'working' && "bg-[#60A5FA] animate-pulse",
                      agent.status === 'idle' && "bg-[#484F58]",
                      agent.status === 'error' && "bg-[#F85149]",
                      agent.status === 'success' && "bg-[#3FB950]",
                      agent.status === 'pending' && "bg-[#6E7681]"
                    )} />

                    <span className="text-sm text-[#F0F6FC] capitalize">{agent.type}</span>

                    {/* Mini progress for working agents */}
                    {agent.status === 'working' && agent.currentTask?.progress !== undefined && (
                      <div className="w-12 h-1 bg-[#21262D] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${agent.currentTask.progress}%`,
                            background: `linear-gradient(to right, ${colors.border}, ${colors.border}cc)`
                          }}
                        />
                      </div>
                    )}
                  </button>
                );
              })}

              {agents.length === 0 && (
                <div className="w-full py-4 text-center text-[#6E7681]">
                  No agents active yet
                </div>
              )}
            </div>
          </div>

          {/* Pool Widget and Status */}
          <AgentPoolWidget className={cn(
            "shrink-0",
            "bg-[#161B22]/60 backdrop-blur-sm border-[#30363D]"
          )} />
          <AgentPoolStatus
            agents={poolAgents}
            maxAgents={10}
            selectedAgent={selectedAgentId ?? undefined}
            onSelectAgent={handleAgentSelect}
            className="shrink-0"
            data-testid="agent-pool-status"
          />

          {/* Main Content Grid */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
            {/* Active Agents List */}
            <div className="flex flex-col gap-4 overflow-auto" data-testid="agents-list">
              <h2 className="text-sm font-semibold text-[#8B949E] uppercase tracking-wider">
                Active Agents
              </h2>
              {agents.length === 0 ? (
                <div className={cn(
                  "flex flex-col items-center justify-center py-12 text-center",
                  "rounded-xl bg-[#161B22]/40 border border-[#30363D]"
                )}>
                  <div className={cn(
                    "h-16 w-16 rounded-2xl flex items-center justify-center mb-4",
                    "bg-[#21262D] border border-[#30363D]"
                  )}>
                    <Bot className="h-8 w-8 text-[#484F58]" />
                  </div>
                  <p className="text-[#8B949E] text-sm">No agents active</p>
                  <p className="text-[#6E7681] text-xs mt-1">
                    Agents will appear here when a task is being processed
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {agents.map((agent) => (
                    <AgentCard
                      key={agent.id}
                      agent={agent}
                      selected={agent.id === selectedAgentId}
                      onClick={() => { handleAgentDetailOpen(agent.id); }}
                      data-testid={`agent-card-${agent.id}`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Selected Agent Details */}
            <div className="flex flex-col gap-4 min-h-0" data-testid="agent-details">
              {selectedAgent ? (
                <>
                  <h2 className="text-sm font-semibold text-[#8B949E] uppercase tracking-wider shrink-0">
                    Agent Output
                  </h2>
                  <AgentActivity
                    agentId={selectedAgent.id}
                    output={agentOutput}
                    status={selectedAgent.status}
                    className={cn(
                      "flex-1 min-h-0",
                      "bg-[#161B22]/60 backdrop-blur-sm border-[#30363D]"
                    )}
                    data-testid="agent-activity"
                  />

                  {/* QA Status */}
                  <div className="shrink-0">
                    <h3 className="text-sm font-semibold text-[#8B949E] uppercase tracking-wider mb-3">
                      QA Status
                    </h3>
                    <QAStatusPanel
                      steps={qaSteps}
                      iteration={selectedAgent.iteration?.current ?? iteration.current}
                      maxIterations={selectedAgent.iteration?.max ?? iteration.max}
                      orientation="horizontal"
                      data-testid="qa-status-panel"
                    />
                  </div>
                </>
              ) : (
                <div className={cn(
                  "flex items-center justify-center h-full",
                  "rounded-xl bg-[#161B22]/40 border border-[#30363D]",
                  "text-[#6E7681]"
                )}>
                  Select an agent to view details
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <AgentDetailModal
        agentId={detailAgentId}
        isOpen={detailAgentId !== null}
        onClose={() => { setDetailAgentId(null); }}
      />
    </div>
  );
}
