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

export const useAgentStore = create<AgentState>()((set, get) => ({
  agents: new Map(),

  setAgentStatus: (status) =>
    set((state) => {
      const newAgents = new Map(state.agents)
      newAgents.set(status.id, status)
      return { agents: newAgents }
    }),
  updateAgent: (id, update) =>
    set((state) => {
      const newAgents = new Map(state.agents)
      const existing = newAgents.get(id)
      if (existing) {
        newAgents.set(id, { ...existing, ...update })
      }
      return { agents: newAgents }
    }),
  removeAgent: (id) =>
    set((state) => {
      const newAgents = new Map(state.agents)
      newAgents.delete(id)
      return { agents: newAgents }
    }),
  getActiveCount: () => {
    let count = 0
    get().agents.forEach((a) => {
      if (a.status === 'working') count++
    })
    return count
  },
  clearAgents: () => set({ agents: new Map() }),
  reset: () => set({ agents: new Map() })
}))

// Selector hooks for optimized re-renders
export const useAgents = () => useAgentStore((s) => s.agents)

/** Returns all agents as an array */
export const useAgentsArray = () => {
  const agents = useAgentStore((s) => s.agents)
  return Array.from(agents.values())
}

/** Returns only agents that are currently working */
export const useActiveAgents = () => {
  const agents = useAgentStore((s) => s.agents)
  return Array.from(agents.values()).filter((a) => a.status === 'working')
}

/** Returns agents by type */
export const useAgentsByType = (type: AgentStatus['type']) => {
  const agents = useAgentStore((s) => s.agents)
  return Array.from(agents.values()).filter((a) => a.type === type)
}
