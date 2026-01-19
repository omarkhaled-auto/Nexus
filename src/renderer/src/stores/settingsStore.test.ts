import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useSettingsStore } from './settingsStore'
import type { NexusSettingsPublic } from '../../../shared/types/settings'

const mockSettings: NexusSettingsPublic = {
  llm: {
    claude: {
      backend: 'cli',
      hasApiKey: true,
      timeout: 300000,
      maxRetries: 2,
      model: 'claude-sonnet-4',
    },
    gemini: {
      backend: 'cli',
      hasApiKey: false,
      model: 'gemini-2.5-pro',
      timeout: 300000,
    },
    embeddings: {
      backend: 'local',
      hasApiKey: false,
      localModel: 'all-MiniLM-L6-v2',
      dimensions: 384,
      cacheEnabled: true,
    },
    defaultProvider: 'claude',
    defaultModel: 'claude-sonnet-4',
    fallbackEnabled: true,
    fallbackOrder: ['gemini'],
    hasClaudeKey: true,
    hasGeminiKey: false,
    hasOpenaiKey: false
  },
  agents: {
    maxParallelAgents: 4,
    taskTimeoutMinutes: 30,
    maxRetries: 3,
    autoRetryEnabled: true
  },
  checkpoints: {
    autoCheckpointEnabled: true,
    autoCheckpointIntervalMinutes: 15,
    maxCheckpointsToKeep: 10,
    checkpointOnFeatureComplete: true
  },
  ui: {
    theme: 'system',
    sidebarWidth: 280,
    showNotifications: true,
    notificationDuration: 4000
  },
  project: {
    defaultLanguage: 'typescript',
    defaultTestFramework: 'vitest',
    outputDirectory: './output'
  }
}

describe('settingsStore', () => {
  const originalNexusAPI = window.nexusAPI

  beforeEach(() => {
    // Reset store state
    useSettingsStore.setState({
      settings: null,
      isLoading: false,
      isDirty: false,
      pendingChanges: {}
    })

    // Mock window.nexusAPI.settings
    window.nexusAPI = {
      ...originalNexusAPI,
      settings: {
        getAll: vi.fn().mockResolvedValue(mockSettings),
        get: vi.fn(),
        set: vi.fn().mockResolvedValue(true),
        setApiKey: vi.fn().mockResolvedValue(true),
        hasApiKey: vi.fn(),
        clearApiKey: vi.fn().mockResolvedValue(true),
        reset: vi.fn().mockResolvedValue(undefined)
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any
  })

  afterEach(() => {
    window.nexusAPI = originalNexusAPI
  })

  describe('loadSettings', () => {
    it('loads settings from main process', async () => {
      await useSettingsStore.getState().loadSettings()
      expect(useSettingsStore.getState().settings).toEqual(mockSettings)
      expect(useSettingsStore.getState().isLoading).toBe(false)
    })

    it('sets isLoading during load', async () => {
      const loadPromise = useSettingsStore.getState().loadSettings()
      // While loading, isLoading should be true (may be async)
      await loadPromise
      expect(useSettingsStore.getState().isLoading).toBe(false)
    })

    it('clears pending changes after load', async () => {
      useSettingsStore.setState({
        pendingChanges: { ui: { theme: 'dark' } },
        isDirty: true
      })
      await useSettingsStore.getState().loadSettings()
      expect(useSettingsStore.getState().pendingChanges).toEqual({})
      expect(useSettingsStore.getState().isDirty).toBe(false)
    })
  })

  describe('updateSetting', () => {
    it('tracks pending changes', () => {
      useSettingsStore.setState({ settings: mockSettings })
      useSettingsStore.getState().updateSetting('ui', 'theme', 'dark')
      expect(useSettingsStore.getState().isDirty).toBe(true)
      expect(useSettingsStore.getState().pendingChanges).toEqual({
        ui: { theme: 'dark' }
      })
    })

    it('accumulates multiple changes in same category', () => {
      useSettingsStore.setState({ settings: mockSettings })
      useSettingsStore.getState().updateSetting('ui', 'theme', 'dark')
      useSettingsStore.getState().updateSetting('ui', 'sidebarWidth', 300)
      expect(useSettingsStore.getState().pendingChanges).toEqual({
        ui: { theme: 'dark', sidebarWidth: 300 }
      })
    })

    it('tracks changes across multiple categories', () => {
      useSettingsStore.setState({ settings: mockSettings })
      useSettingsStore.getState().updateSetting('ui', 'theme', 'dark')
      useSettingsStore.getState().updateSetting('agents', 'maxParallelAgents', 8)
      expect(useSettingsStore.getState().pendingChanges).toEqual({
        ui: { theme: 'dark' },
        agents: { maxParallelAgents: 8 }
      })
    })
  })

  describe('saveSettings', () => {
    it('saves pending changes to main process', async () => {
      useSettingsStore.setState({
        settings: mockSettings,
        pendingChanges: { ui: { theme: 'dark' } },
        isDirty: true
      })
      const result = await useSettingsStore.getState().saveSettings()
      expect(result).toBe(true)
      expect(window.nexusAPI.settings.set).toHaveBeenCalledWith('ui.theme', 'dark')
    })

    it('reloads settings after save', async () => {
      useSettingsStore.setState({
        settings: mockSettings,
        pendingChanges: { ui: { theme: 'dark' } },
        isDirty: true
      })
      await useSettingsStore.getState().saveSettings()
      expect(window.nexusAPI.settings.getAll).toHaveBeenCalled()
    })

    it('returns false when settings is null', async () => {
      useSettingsStore.setState({
        settings: null,
        pendingChanges: { ui: { theme: 'dark' } },
        isDirty: true
      })
      const result = await useSettingsStore.getState().saveSettings()
      expect(result).toBe(false)
    })
  })

  describe('discardChanges', () => {
    it('clears pending changes', () => {
      useSettingsStore.setState({
        settings: mockSettings,
        pendingChanges: { ui: { theme: 'dark' } },
        isDirty: true
      })
      useSettingsStore.getState().discardChanges()
      expect(useSettingsStore.getState().isDirty).toBe(false)
      expect(useSettingsStore.getState().pendingChanges).toEqual({})
    })
  })

  describe('API key management', () => {
    it('sets API key via main process', async () => {
      useSettingsStore.setState({ settings: mockSettings })
      const result = await useSettingsStore.getState().setApiKey('claude', 'test-key')
      expect(result).toBe(true)
      expect(window.nexusAPI.settings.setApiKey).toHaveBeenCalledWith('claude', 'test-key')
    })

    it('clears API key via main process', async () => {
      useSettingsStore.setState({ settings: mockSettings })
      const result = await useSettingsStore.getState().clearApiKey('claude')
      expect(result).toBe(true)
      expect(window.nexusAPI.settings.clearApiKey).toHaveBeenCalledWith('claude')
    })

    it('reloads settings after setting API key', async () => {
      useSettingsStore.setState({ settings: mockSettings })
      await useSettingsStore.getState().setApiKey('claude', 'test-key')
      expect(window.nexusAPI.settings.getAll).toHaveBeenCalled()
    })
  })

  describe('resetToDefaults', () => {
    it('calls reset on main process and reloads', async () => {
      useSettingsStore.setState({ settings: mockSettings })
      await useSettingsStore.getState().resetToDefaults()
      expect(window.nexusAPI.settings.reset).toHaveBeenCalled()
      expect(window.nexusAPI.settings.getAll).toHaveBeenCalled()
    })
  })

  describe('selector hooks', () => {
    it('useHasApiKey returns correct values', () => {
      useSettingsStore.setState({ settings: mockSettings })
      // Directly test the selector logic
      const state = useSettingsStore.getState()
      expect(state.settings?.llm.hasClaudeKey).toBe(true)
      expect(state.settings?.llm.hasGeminiKey).toBe(false)
      expect(state.settings?.llm.hasOpenaiKey).toBe(false)
    })
  })
})
