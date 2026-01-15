/**
 * UIBackendBridge Tests
 * Phase 05-04: Test suite for UI to backend bridge
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { UIBackendBridge } from './UIBackendBridge'

// Mock the stores
vi.mock('../stores/projectStore', () => ({
  useProjectStore: {
    getState: vi.fn(() => ({
      setMode: vi.fn(),
    })),
  },
}))

vi.mock('../stores/taskStore', () => ({
  useTaskStore: {
    getState: vi.fn(() => ({
      setTasks: vi.fn(),
      updateTask: vi.fn(),
    })),
  },
}))

vi.mock('../stores/agentStore', () => ({
  useAgentStore: {
    getState: vi.fn(() => ({
      setAgentStatus: vi.fn(),
    })),
  },
}))

vi.mock('../stores/uiStore', () => ({
  useUIStore: {
    getState: vi.fn(() => ({
      setLoading: vi.fn(),
      setError: vi.fn(),
    })),
  },
}))

// Mock window.nexusAPI
const mockNexusAPI = {
  startGenesis: vi.fn().mockResolvedValue({ success: true }),
  startEvolution: vi.fn().mockResolvedValue({ success: true }),
  getTasks: vi.fn().mockResolvedValue([]),
  getAgentStatus: vi.fn().mockResolvedValue([]),
  pauseExecution: vi.fn().mockResolvedValue({ success: true }),
  onTaskUpdate: vi.fn().mockReturnValue(() => {}),
  onAgentStatus: vi.fn().mockReturnValue(() => {}),
  onExecutionProgress: vi.fn().mockReturnValue(() => {}),
}

vi.stubGlobal('window', { nexusAPI: mockNexusAPI })

describe('UIBackendBridge', () => {
  beforeEach(() => {
    UIBackendBridge.resetInstance()
    vi.clearAllMocks()
  })

  afterEach(() => {
    UIBackendBridge.resetInstance()
  })

  describe('singleton pattern', () => {
    it('should return same instance on multiple calls', () => {
      const a = UIBackendBridge.getInstance()
      const b = UIBackendBridge.getInstance()
      expect(a).toBe(b)
    })

    it('should create new instance after reset', () => {
      const a = UIBackendBridge.getInstance()
      UIBackendBridge.resetInstance()
      const b = UIBackendBridge.getInstance()
      expect(a).not.toBe(b)
    })
  })

  describe('initialize()', () => {
    it('should subscribe to IPC events', async () => {
      const bridge = UIBackendBridge.getInstance()
      await bridge.initialize()

      expect(mockNexusAPI.onTaskUpdate).toHaveBeenCalled()
      expect(mockNexusAPI.onAgentStatus).toHaveBeenCalled()
      expect(mockNexusAPI.onExecutionProgress).toHaveBeenCalled()
    })

    it('should only initialize once (idempotent)', async () => {
      const bridge = UIBackendBridge.getInstance()
      await bridge.initialize()
      await bridge.initialize()

      expect(mockNexusAPI.onTaskUpdate).toHaveBeenCalledTimes(1)
    })

    it('should set initialized flag', async () => {
      const bridge = UIBackendBridge.getInstance()
      expect(bridge.isInitialized()).toBe(false)

      await bridge.initialize()

      expect(bridge.isInitialized()).toBe(true)
    })
  })

  describe('startGenesis()', () => {
    it('should call nexusAPI.startGenesis', async () => {
      const bridge = UIBackendBridge.getInstance()
      await bridge.startGenesis()

      expect(mockNexusAPI.startGenesis).toHaveBeenCalled()
    })

    it('should throw on failure', async () => {
      mockNexusAPI.startGenesis.mockResolvedValueOnce({ success: false })

      const bridge = UIBackendBridge.getInstance()
      await expect(bridge.startGenesis()).rejects.toThrow(
        'Failed to start Genesis mode'
      )
    })
  })

  describe('startEvolution()', () => {
    it('should call nexusAPI.startEvolution with projectId', async () => {
      const bridge = UIBackendBridge.getInstance()
      await bridge.startEvolution('project-123')

      expect(mockNexusAPI.startEvolution).toHaveBeenCalledWith('project-123')
    })

    it('should throw on failure', async () => {
      mockNexusAPI.startEvolution.mockResolvedValueOnce({ success: false })

      const bridge = UIBackendBridge.getInstance()
      await expect(bridge.startEvolution('project-123')).rejects.toThrow(
        'Failed to start Evolution mode'
      )
    })
  })

  describe('loadTasks()', () => {
    it('should fetch and load tasks', async () => {
      const mockTasks = [
        { id: 't1', name: 'Task 1', status: 'pending' },
        { id: 't2', name: 'Task 2', status: 'completed' },
      ]
      mockNexusAPI.getTasks.mockResolvedValueOnce(mockTasks)

      const bridge = UIBackendBridge.getInstance()
      await bridge.loadTasks()

      expect(mockNexusAPI.getTasks).toHaveBeenCalled()
    })
  })

  describe('loadAgentStatus()', () => {
    it('should fetch and load agent status', async () => {
      const mockAgents = [
        { id: 'a1', type: 'coder', status: 'idle' },
        { id: 'a2', type: 'tester', status: 'working' },
      ]
      mockNexusAPI.getAgentStatus.mockResolvedValueOnce(mockAgents)

      const bridge = UIBackendBridge.getInstance()
      await bridge.loadAgentStatus()

      expect(mockNexusAPI.getAgentStatus).toHaveBeenCalled()
    })
  })

  describe('pauseExecution()', () => {
    it('should call nexusAPI.pauseExecution', async () => {
      const bridge = UIBackendBridge.getInstance()
      await bridge.pauseExecution()

      expect(mockNexusAPI.pauseExecution).toHaveBeenCalled()
    })

    it('should pass reason to nexusAPI.pauseExecution', async () => {
      const bridge = UIBackendBridge.getInstance()
      await bridge.pauseExecution('User requested pause')

      expect(mockNexusAPI.pauseExecution).toHaveBeenCalledWith(
        'User requested pause'
      )
    })

    it('should throw on failure', async () => {
      mockNexusAPI.pauseExecution.mockResolvedValueOnce({ success: false })

      const bridge = UIBackendBridge.getInstance()
      await expect(bridge.pauseExecution()).rejects.toThrow(
        'Failed to pause execution'
      )
    })
  })

  describe('cleanup()', () => {
    it('should unsubscribe from events', async () => {
      const unsubMock = vi.fn()
      mockNexusAPI.onTaskUpdate.mockReturnValue(unsubMock)
      mockNexusAPI.onAgentStatus.mockReturnValue(unsubMock)
      mockNexusAPI.onExecutionProgress.mockReturnValue(unsubMock)

      const bridge = UIBackendBridge.getInstance()
      await bridge.initialize()
      bridge.cleanup()

      expect(unsubMock).toHaveBeenCalledTimes(3)
    })

    it('should reset initialized flag', async () => {
      const bridge = UIBackendBridge.getInstance()
      await bridge.initialize()
      expect(bridge.isInitialized()).toBe(true)

      bridge.cleanup()
      expect(bridge.isInitialized()).toBe(false)
    })
  })
})
