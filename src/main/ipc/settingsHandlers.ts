/**
 * Settings IPC Handlers - Main Process
 * Phase 12-01: Settings backend infrastructure
 *
 * Provides IPC bridge between renderer and SettingsService.
 * All handlers validate sender origin for security.
 */

import type { IpcMainInvokeEvent } from 'electron';
import { ipcMain } from 'electron'
import { settingsService } from '../services/settingsService'
import type { LLMProvider } from '../../shared/types/settings'
import { ClaudeCodeCLIClient } from '../../llm/clients/ClaudeCodeCLIClient'
import { GeminiCLIClient } from '../../llm/clients/GeminiCLIClient'

/**
 * Allowed origins for IPC communication
 */
const ALLOWED_ORIGINS = ['http://localhost:5173', 'file://']

/**
 * Validate IPC sender is from allowed origin
 */
function validateSender(event: IpcMainInvokeEvent): boolean {
  const url = event.sender.getURL()
  return ALLOWED_ORIGINS.some((origin) => url.startsWith(origin))
}

/**
 * Validate provider is a valid LLM provider
 */
function isValidProvider(provider: unknown): provider is LLMProvider {
  return provider === 'claude' || provider === 'gemini' || provider === 'openai'
}

/**
 * Register all settings IPC handlers
 * Must be called after app.whenReady()
 */
export function registerSettingsHandlers(): void {
  // ========================================
  // Get All Settings (Public View)
  // ========================================

  ipcMain.handle('settings:getAll', (event) => {
    if (!validateSender(event)) {
      throw new Error('Unauthorized IPC sender')
    }

    return settingsService.getAll()
  })

  // ========================================
  // Get Single Setting
  // ========================================

  ipcMain.handle('settings:get', (event, key: string) => {
    if (!validateSender(event)) {
      throw new Error('Unauthorized IPC sender')
    }

    if (typeof key !== 'string' || !key) {
      throw new Error('Invalid settings key')
    }

    return settingsService.get(key)
  })

  // ========================================
  // Set Single Setting
  // ========================================

  ipcMain.handle('settings:set', (event, key: string, value: unknown) => {
    if (!validateSender(event)) {
      throw new Error('Unauthorized IPC sender')
    }

    if (typeof key !== 'string' || !key) {
      throw new Error('Invalid settings key')
    }

    settingsService.set(key, value)
    return true
  })

  // ========================================
  // Set API Key (Secure)
  // ========================================

  ipcMain.handle('settings:setApiKey', (event, provider: string, key: string) => {
    if (!validateSender(event)) {
      throw new Error('Unauthorized IPC sender')
    }

    if (!isValidProvider(provider)) {
      throw new Error('Invalid LLM provider. Must be claude, gemini, or openai.')
    }

    if (typeof key !== 'string' || !key) {
      throw new Error('Invalid API key')
    }

    return settingsService.setApiKey(provider, key)
  })

  // ========================================
  // Check if API Key Exists
  // ========================================

  ipcMain.handle('settings:hasApiKey', (event, provider: string) => {
    if (!validateSender(event)) {
      throw new Error('Unauthorized IPC sender')
    }

    if (!isValidProvider(provider)) {
      throw new Error('Invalid LLM provider. Must be claude, gemini, or openai.')
    }

    return settingsService.hasApiKey(provider)
  })

  // ========================================
  // Clear API Key
  // ========================================

  ipcMain.handle('settings:clearApiKey', (event, provider: string) => {
    if (!validateSender(event)) {
      throw new Error('Unauthorized IPC sender')
    }

    if (!isValidProvider(provider)) {
      throw new Error('Invalid LLM provider. Must be claude, gemini, or openai.')
    }

    settingsService.clearApiKey(provider)
    return true
  })

  // ========================================
  // Reset All Settings
  // ========================================

  ipcMain.handle('settings:reset', (event) => {
    if (!validateSender(event)) {
      throw new Error('Unauthorized IPC sender')
    }

    settingsService.reset()
    return true
  })

  // ========================================
  // Check CLI Availability (Phase 17B)
  // ========================================

  ipcMain.handle('settings:checkCliAvailability', async (event, provider: string) => {
    if (!validateSender(event)) {
      throw new Error('Unauthorized IPC sender')
    }

    if (provider !== 'claude' && provider !== 'gemini') {
      throw new Error('Invalid provider. Must be claude or gemini.')
    }

    try {
      if (provider === 'claude') {
        const client = new ClaudeCodeCLIClient()
        const available = await client.isAvailable()
        if (available) {
          const version = await client.getVersion()
          return { detected: true, message: `Claude CLI ${version}` }
        }
        return { detected: false, message: 'Claude CLI not found' }
      } else {
        const client = new GeminiCLIClient()
        const available = await client.isAvailable()
        if (available) {
          const version = await client.getVersion()
          return { detected: true, message: `Gemini CLI ${version}` }
        }
        return { detected: false, message: 'Gemini CLI not found' }
      }
    } catch (error) {
      console.error(`Failed to check ${provider} CLI availability:`, error)
      return { detected: false, message: `Failed to detect ${provider} CLI` }
    }
  })
}
