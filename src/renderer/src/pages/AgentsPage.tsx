import type { ReactElement } from 'react';
import { Header } from '@renderer/components/layout/Header';
import { Bot, Play, Pause, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@renderer/components/ui/button';
import { Alert, AlertDescription } from '@renderer/components/ui/Alert';
import { Spinner } from '@renderer/components/ui/Spinner';
import {
  AgentPoolStatus,
  AgentCard,
  AgentActivity,
  QAStatusPanel,
  type AgentData,
  type PoolAgent,
  type QAStep,
} from '@renderer/components/agents';
import { useState, useEffect, useCallback } from 'react';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if we are running in Electron environment with nexusAPI available
 */
function isElectronEnvironment(): boolean {
  return typeof window !== 'undefined' && 'nexusAPI' in window && window.nexusAPI !== undefined;
}

/**
 * Map backend agent data to frontend AgentData format
 */
function mapBackendAgent(agent: unknown): AgentData {
  const a = agent as Record<string, unknown>;
  return {
    id: (a.id as string) || 'unknown',
    type: (a.type as AgentData['type']) || 'coder',
    status: (a.status as AgentData['status']) || 'idle',
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
      return {
        type: (s.type as QAStep['type']) || 'build',
        status: (s.status as QAStep['status']) || 'pending',
        duration: s.duration as number | undefined,
        error: s.error as string | undefined,
        testCounts: s.testCounts as QAStep['testCounts'] | undefined,
      };
    });
  }
  return defaultSteps;
}

// ============================================================================
// Mock Data (will be replaced with real data from stores/IPC)
// ============================================================================

const mockAgents: AgentData[] = [
  {
    id: 'agent-1',
    type: 'coder',
    status: 'working',
    model: 'claude-sonnet-4-5-20250929',
    currentTask: {
      id: 'task-1',
      name: 'Implementing auth middleware',
      progress: 65,
    },
    iteration: {
      current: 3,
      max: 50,
    },
    metrics: { tokensUsed: 12450, duration: 45000 },
    currentFile: 'src/auth/middleware.ts',
  },
  {
    id: 'agent-2',
    type: 'reviewer',
    status: 'working',
    model: 'gemini-2.5-pro',
    currentTask: {
      id: 'task-2',
      name: 'Reviewing database schema',
      progress: 30,
    },
    iteration: {
      current: 1,
      max: 10,
    },
    metrics: { tokensUsed: 3200, duration: 15000 },
    currentFile: 'src/database/schema.ts',
  },
  {
    id: 'agent-3',
    type: 'planner',
    status: 'idle',
    model: 'claude-opus-4-5-20251101',
  },
  {
    id: 'agent-4',
    type: 'tester',
    status: 'idle',
    model: 'claude-sonnet-4-5-20250929',
  },
  {
    id: 'agent-5',
    type: 'merger',
    status: 'idle',
    model: 'claude-sonnet-4-5-20250929',
  },
];

const mockQASteps: QAStep[] = [
  { type: 'build', status: 'success', duration: 2300 },
  { type: 'lint', status: 'success', duration: 1100 },
  { type: 'test', status: 'running', testCounts: { passed: 47, failed: 0, skipped: 2 } },
  { type: 'review', status: 'pending' },
];

const mockAgentOutput = [
  '$ Starting implementation...',
  'Analyzing auth requirements from specification',
  'Creating authMiddleware.ts in src/auth/',
  'Adding JWT validation logic',
  '  - Importing jsonwebtoken library',
  '  - Adding token verification function',
  '  - Implementing refresh token rotation',
  'Running TypeScript compilation check...',
  '> No errors found in authMiddleware.ts',
  'Adding unit tests for auth middleware...',
  '  - Testing valid token verification',
  '  - Testing expired token handling',
  '  - Testing invalid signature detection',
  'Running tests...',
  '> All 3 tests passed',
];

// ============================================================================
// AgentsPage Component
// ============================================================================

/**
 * Agents Page - Real-time monitoring of AI agent activity.
 *
 * Displays:
 * - Agent pool status overview
 * - List of active agents with details
 * - Selected agent's live output stream
 * - QA pipeline status
 */
export default function AgentsPage(): ReactElement {
  // State for agents and UI
  const [agents, setAgents] = useState<AgentData[]>(mockAgents);
  const [qaSteps, setQASteps] = useState<QAStep[]>(mockQASteps);
  const [iteration, setIteration] = useState<{ current: number; max: number }>({ current: 3, max: 50 });
  const [agentOutput, setAgentOutput] = useState<string[]>(mockAgentOutput);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>('agent-1');
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get selected agent from current agents state
  const selectedAgent = agents.find((a) => a.id === selectedAgentId);

  // Load real data from backend API
  const loadRealData = useCallback(async () => {
    if (!isElectronEnvironment()) return;
    setIsLoading(true);
    setError(null);
    try {
      const api = window.nexusAPI;
      const [agentsData, qaStatusData] = await Promise.all([
        api.getAgents(),
        api.getQAStatus(),
      ]);
      if (agentsData && Array.isArray(agentsData) && agentsData.length > 0) {
        setAgents(agentsData.map(mapBackendAgent));
      }
      if (qaStatusData) {
        const qa = qaStatusData as { iteration?: number; maxIterations?: number };
        setQASteps(mapQAStatus(qaStatusData));
        if (qa.iteration !== undefined && qa.maxIterations !== undefined) {
          setIteration({ current: qa.iteration, max: qa.maxIterations });
        }
      }
      if (selectedAgentId) {
        try {
          const output = await api.getAgentOutput(selectedAgentId);
          if (output && output.length > 0) setAgentOutput(output);
        } catch { /* Ignore output fetch errors */ }
      }
    } catch (err) {
      console.error('Failed to load agent data:', err);
      setError('Failed to load agent data. Using demo data.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedAgentId]);

  // Subscribe to real-time events
  const subscribeToEvents = useCallback(() => {
    if (!isElectronEnvironment()) return () => {};
    const api = window.nexusAPI;
    const unsubscribers: (() => void)[] = [];
    unsubscribers.push(api.onAgentStatus((status) => {
      const s = status as { id?: string; agentId?: string } & Record<string, unknown>;
      const agentId = s.id || s.agentId;
      if (agentId) {
        setAgents((prev) => prev.map((a) => a.id === agentId ? { ...a, status: (s.status as AgentData['status']) || a.status } : a));
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
    return () => { unsubscribers.forEach((unsub) => unsub()); };
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
      try { await window.nexusAPI.pauseExecution(isPaused ? 'user_resume' : 'user_pause'); }
      catch (err) { console.error('Failed to pause/resume:', err); }
    }
  };

  const handleRefresh = () => { void loadRealData(); };

  const handleAgentSelect = (agentId: string) => {
    setSelectedAgentId(agentId);
    if (isElectronEnvironment()) {
      void window.nexusAPI.getAgentOutput(agentId).then((output) => {
        if (output && output.length > 0) setAgentOutput(output);
        else setAgentOutput(mockAgentOutput);
      });
    }
  };

  // Prepare pool agents for display
  const poolAgents: PoolAgent[] = agents.map((a) => ({ id: a.id, type: a.type, status: a.status, taskName: a.currentTask?.name }));
  const refreshIconClass = isLoading ? 'w-4 h-4 mr-2 animate-spin' : 'w-4 h-4 mr-2';

  return (
    <div className="flex flex-col h-screen" data-testid="agents-page">
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
            >
              <RefreshCw className={refreshIconClass} />
              Refresh
            </Button>
            <Button
              variant={isPaused ? 'primary' : 'outline'}
              size="sm"
              onClick={handlePauseAll}
              data-testid="pause-all-button"
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
        <div className="px-6 pt-4">
          <Alert variant="warning" dismissible onDismiss={() => setError(null)}>
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center p-4">
          <Spinner size="sm" className="mr-2" />
          <span className="text-text-secondary">Loading agent data...</span>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-hidden p-6">
        <div className="h-full flex flex-col gap-6">
          {/* Agent Pool Status */}
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
              <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
                Active Agents
              </h2>
              <div className="space-y-3">
                {agents.map((agent) => (
                  <AgentCard
                    key={agent.id}
                    agent={agent}
                    selected={agent.id === selectedAgentId}
                    onClick={() => handleAgentSelect(agent.id)}
                    data-testid={`agent-card-${agent.id}`}
                  />
                ))}
              </div>
            </div>

            {/* Selected Agent Details */}
            <div className="flex flex-col gap-4 min-h-0" data-testid="agent-details">
              {selectedAgent ? (
                <>
                  <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider shrink-0">
                    Agent Output
                  </h2>
                  <AgentActivity
                    agentId={selectedAgent.id}
                    output={agentOutput}
                    status={selectedAgent.status}
                    className="flex-1 min-h-0"
                    data-testid="agent-activity"
                  />

                  {/* QA Status */}
                  <div className="shrink-0">
                    <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">
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
                <div className="flex items-center justify-center h-full text-text-tertiary">
                  Select an agent to view details
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
