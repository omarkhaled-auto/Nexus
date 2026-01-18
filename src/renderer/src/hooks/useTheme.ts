/**
 * Theme Effect Hook - Syncs settings theme with DOM
 * Phase 12-02: Theme toggle with system detection
 *
 * Applies theme class to document root and listens
 * for system preference changes when theme is 'system'.
 */

import { useEffect } from 'react'
import { useSettingsStore } from '../stores/settingsStore'

/**
 * Apply theme effect to document root.
 *
 * - Reads theme from settings store
 * - Applies 'dark' class when needed
 * - Listens for system preference changes
 *
 * Call this hook once at the app root level.
 */
export function useThemeEffect(): void {
  // Get theme from settings (falls back to 'system' if not loaded)
  const theme = useSettingsStore((s) => s.settings?.ui.theme ?? 'system')

  useEffect(() => {
    const root = document.documentElement

    function applyTheme(): void {
      // Remove existing theme classes
      root.classList.remove('light', 'dark')

      if (theme === 'system') {
        // Use system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        root.classList.add(prefersDark ? 'dark' : 'light')
      } else {
        // Use explicit theme
        root.classList.add(theme)
      }
    }

    // Apply theme immediately
    applyTheme()

    // Listen for system preference changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (): void => {
      if (theme === 'system') {
        applyTheme()
      }
    }

    mediaQuery.addEventListener('change', handler)

    return () => {
      mediaQuery.removeEventListener('change', handler)
    }
  }, [theme])
}

/**
 * Get current resolved theme (accounting for system preference)
 */
export function useResolvedTheme(): 'light' | 'dark' {
  const theme = useSettingsStore((s) => s.settings?.ui.theme ?? 'system')

  if (theme === 'system') {
    // Note: This won't update on system preference change without re-render
    // For reactive updates, use useThemeEffect and rely on class changes
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }

  return theme
}
