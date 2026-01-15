import { describe, it, expect, beforeEach } from 'vitest'
import { useAgentStore } from './agentStore'

describe('agentStore', () => {
  beforeEach(() => {
    useAgentStore.getState().reset()
  })

  describe('agent status management', () => {
    it('should initialize with empty agents map', () => {
      expect(useAgentStore.getState().agents.size).toBe(0)
    })

    it('should set agent status', () => {
      const agent = {
        id: 'a1',
        type: 'coder' as const,
        status: 'idle' as const
      }
      useAgentStore.getState().setAgentStatus(agent)
      expect(useAgentStore.getState().agents.get('a1')).toEqual(agent)
    })

    it('should update single agent', () => {
      const agent = {
        id: 'a1',
        type: 'coder' as const,
        status: 'idle' as const
      }
      useAgentStore.getState().setAgentStatus(agent)
      useAgentStore.getState().updateAgent('a1', { status: 'working' })
      expect(useAgentStore.getState().agents.get('a1')?.status).toBe('working')
    })

    it('should remove agent', () => {
      const agent = {
        id: 'a1',
        type: 'coder' as const,
        status: 'idle' as const
      }
      useAgentStore.getState().setAgentStatus(agent)
      useAgentStore.getState().removeAgent('a1')
      expect(useAgentStore.getState().agents.has('a1')).toBe(false)
    })

    it('should get active agents count', () => {
      useAgentStore.getState().setAgentStatus({
        id: 'a1',
        type: 'coder' as const,
        status: 'working' as const
      })
      useAgentStore.getState().setAgentStatus({
        id: 'a2',
        type: 'tester' as const,
        status: 'idle' as const
      })
      useAgentStore.getState().setAgentStatus({
        id: 'a3',
        type: 'reviewer' as const,
        status: 'working' as const
      })
      expect(useAgentStore.getState().getActiveCount()).toBe(2)
    })

    it('should clear all agents', () => {
      useAgentStore.getState().setAgentStatus({
        id: 'a1',
        type: 'coder' as const,
        status: 'idle' as const
      })
      useAgentStore.getState().clearAgents()
      expect(useAgentStore.getState().agents.size).toBe(0)
    })
  })
})
