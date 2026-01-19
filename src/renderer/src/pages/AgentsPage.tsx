import type { ReactElement } from 'react';
import { Header } from '@renderer/components/layout/Header';
import { Bot, Play, Pause, RefreshCw } from 'lucide-react';
import { Button } from '@renderer/components/ui/button';
import {
  AgentPoolStatus,
  AgentCard,
  AgentActivity,
  QAStatusPanel,
  type AgentData,
  type PoolAgent,
  type QAStep,
  type QAStepType,
} from '@renderer/components/agents';
import { useState } from 'react';
import { type AgentType, type AgentStatus } from '@renderer/styles/tokens';

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

const mockPoolAgents: PoolAgent[] = mockAgents.map((a) => ({
  id: a.id,
  type: a.type,
  status: a.status,
  taskName: a.currentTask?.name,
}));

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
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>('agent-1');
  const [isPaused, setIsPaused] = useState(false);

  const selectedAgent = mockAgents.find((a) => a.id === selectedAgentId);

  const handlePauseAll = () => {
    setIsPaused((prev) => !prev);
    // TODO: Implement actual pause/resume via IPC
  };

  const handleRefresh = () => {
    // TODO: Implement refresh via IPC
  };

  const handleAgentSelect = (agentId: string) => {
    setSelectedAgentId(agentId);
  };

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
              data-testid="refresh-agents-button"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
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

      {/* Main Content */}
      <div className="flex-1 overflow-hidden p-6">
        <div className="h-full flex flex-col gap-6">
          {/* Agent Pool Status */}
          <AgentPoolStatus
            agents={mockPoolAgents}
            maxAgents={5}
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
                {mockAgents.map((agent) => (
                  <AgentCard
                    key={agent.id}
                    agent={agent}
                    selected={agent.id === selectedAgentId}
                    onClick={() => setSelectedAgentId(agent.id)}
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
                    output={mockAgentOutput}
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
                      steps={mockQASteps}
                      iteration={selectedAgent.iteration?.current ?? 0}
                      maxIterations={selectedAgent.iteration?.max ?? 50}
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
