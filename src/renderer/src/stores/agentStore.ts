import { create } from 'zustand'

export interface AgentStatus {
  id: string
  type: 'coder' | 'tester' | 'reviewer' | 'merger'
  status: 'idle' | 'working' | 'error'
  currentTaskId?: string
}

interface AgentState {
  agents: Map<string, AgentStatus>

  setAgentStatus: (status: AgentStatus) => void
  updateAgent: (id: string, update: Partial<AgentStatus>) => void
  removeAgent: (id: string) => void
  getActiveCount: () => number
  clearAgents: () => void
  reset: () => void
}

// Stub implementation - tests will fail
export const useAgentStore = create<AgentState>()((set, get) => ({
  agents: new Map(),

  setAgentStatus: () => {},
  updateAgent: () => {},
  removeAgent: () => {},
  getActiveCount: () => 0,
  clearAgents: () => {},
  reset: () => {}
}))
