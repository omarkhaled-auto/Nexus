/**
 * Settings Store - Zustand store synced with main process
 * Phase 12-02: Settings UI with IPC sync
 *
 * Manages settings state in renderer, syncs changes to main process
 * via IPC for persistence in electron-store.
 */

import { create } from 'zustand'
import type { NexusSettingsPublic, LLMProvider } from '../../../shared/types/settings'

/**
 * Pending changes tracked before saving
 */
type PendingChanges = {
  [K in keyof NexusSettingsPublic]?: Partial<NexusSettingsPublic[K]>
}

/**
 * Settings store state and actions
 */
interface SettingsState {
  /** Current settings from main process */
  settings: NexusSettingsPublic | null
  /** Loading state */
  isLoading: boolean
  /** Whether there are unsaved changes */
  isDirty: boolean
  /** Changes pending save */
  pendingChanges: PendingChanges

  /** Load settings from main process */
  loadSettings: () => Promise<void>
  /** Update a single setting (tracks in pendingChanges) */
  updateSetting: <K extends keyof NexusSettingsPublic>(
    category: K,
    key: keyof NexusSettingsPublic[K],
    value: NexusSettingsPublic[K][keyof NexusSettingsPublic[K]]
  ) => void
  /** Save all pending changes to main process */
  saveSettings: () => Promise<boolean>
  /** Discard pending changes and reload from main */
  discardChanges: () => void
  /** Set API key securely via main process */
  setApiKey: (provider: LLMProvider, key: string) => Promise<boolean>
  /** Clear API key via main process */
  clearApiKey: (provider: LLMProvider) => Promise<boolean>
  /** Reset all settings to defaults */
  resetToDefaults: () => Promise<void>
}

/**
 * Get the merged settings with pending changes applied
 */
function getMergedSettings(
  settings: NexusSettingsPublic | null,
  pendingChanges: PendingChanges
): NexusSettingsPublic | null {
  if (!settings) return null

  return {
    llm: { ...settings.llm, ...pendingChanges.llm },
    agents: { ...settings.agents, ...pendingChanges.agents },
    checkpoints: { ...settings.checkpoints, ...pendingChanges.checkpoints },
    ui: { ...settings.ui, ...pendingChanges.ui },
    project: { ...settings.project, ...pendingChanges.project }
  }
}

/**
 * Settings store instance
 */
export const useSettingsStore = create<SettingsState>()((set, get) => ({
  settings: null,
  isLoading: false,
  isDirty: false,
  pendingChanges: {},

  loadSettings: async () => {
    set({ isLoading: true })
    try {
      const settings = await window.nexusAPI.settings.getAll()
      set({ settings, isLoading: false, isDirty: false, pendingChanges: {} })
    } catch (error) {
      console.error('Failed to load settings:', error)
      set({ isLoading: false })
    }
  },

  updateSetting: (category, key, value) => {
    const { pendingChanges } = get()
    const categoryChanges = pendingChanges[category] ?? {}

    set({
      pendingChanges: {
        ...pendingChanges,
        [category]: {
          ...categoryChanges,
          [key]: value
        }
      },
      isDirty: true
    })
  },

  saveSettings: async () => {
    const { pendingChanges, settings } = get()

    if (!settings) return false

    try {
      // Save each changed setting to main process
      for (const [category, changes] of Object.entries(pendingChanges)) {
        if (!changes) continue

        for (const [key, value] of Object.entries(changes)) {
          const settingPath = `${category}.${key}`
          await window.nexusAPI.settings.set(settingPath, value)
        }
      }

      // Reload settings from main to ensure consistency
      await get().loadSettings()
      return true
    } catch (error) {
      console.error('Failed to save settings:', error)
      return false
    }
  },

  discardChanges: () => {
    set({ pendingChanges: {}, isDirty: false })
    // Reload from main to ensure UI reflects stored state
    get().loadSettings()
  },

  setApiKey: async (provider, key) => {
    try {
      const result = await window.nexusAPI.settings.setApiKey(provider, key)
      if (result) {
        // Reload settings to update hasXxxKey flags
        await get().loadSettings()
      }
      return result
    } catch (error) {
      console.error('Failed to set API key:', error)
      return false
    }
  },

  clearApiKey: async (provider) => {
    try {
      const result = await window.nexusAPI.settings.clearApiKey(provider)
      if (result) {
        // Reload settings to update hasXxxKey flags
        await get().loadSettings()
      }
      return result
    } catch (error) {
      console.error('Failed to clear API key:', error)
      return false
    }
  },

  resetToDefaults: async () => {
    try {
      await window.nexusAPI.settings.reset()
      await get().loadSettings()
    } catch (error) {
      console.error('Failed to reset settings:', error)
    }
  }
}))

// ============================================
// Selector Hooks
// ============================================

/**
 * Get current settings with pending changes applied
 */
export const useSettings = () =>
  useSettingsStore((s) => getMergedSettings(s.settings, s.pendingChanges))

/**
 * Get raw settings without pending changes
 */
export const useRawSettings = () => useSettingsStore((s) => s.settings)

/**
 * Get current theme setting
 */
export const useThemeSetting = () =>
  useSettingsStore((s) => {
    const merged = getMergedSettings(s.settings, s.pendingChanges)
    return merged?.ui.theme ?? 'system'
  })

/**
 * Check if a provider has an API key set
 */
export const useHasApiKey = (provider: LLMProvider) =>
  useSettingsStore((s) => {
    if (!s.settings) return false
    switch (provider) {
      case 'claude':
        return s.settings.llm.hasClaudeKey
      case 'gemini':
        return s.settings.llm.hasGeminiKey
      case 'openai':
        return s.settings.llm.hasOpenaiKey
      default:
        return false
    }
  })

/**
 * Get loading state
 */
export const useSettingsLoading = () => useSettingsStore((s) => s.isLoading)

/**
 * Get dirty state (unsaved changes)
 */
export const useSettingsDirty = () => useSettingsStore((s) => s.isDirty)
