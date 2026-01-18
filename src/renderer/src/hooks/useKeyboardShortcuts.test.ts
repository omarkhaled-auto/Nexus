import { describe, it, expect } from 'vitest'
import { KEYBOARD_SHORTCUTS } from './useKeyboardShortcuts'

describe('KEYBOARD_SHORTCUTS', () => {
  it('defines all expected shortcuts', () => {
    const shortcutKeys = KEYBOARD_SHORTCUTS.map(s => s.keys.join('+'))
    expect(shortcutKeys).toContain('Cmd/Ctrl+N')
    expect(shortcutKeys).toContain('Cmd/Ctrl+S')
    expect(shortcutKeys).toContain('Cmd/Ctrl+,')
    expect(shortcutKeys).toContain('Cmd/Ctrl+K')
    expect(shortcutKeys).toContain('?')
    expect(shortcutKeys).toContain('Esc')
  })

  it('has 6 shortcuts defined', () => {
    expect(KEYBOARD_SHORTCUTS).toHaveLength(6)
  })

  it('has descriptions for all shortcuts', () => {
    KEYBOARD_SHORTCUTS.forEach(shortcut => {
      expect(shortcut.description).toBeTruthy()
      expect(typeof shortcut.description).toBe('string')
      expect(shortcut.description.length).toBeGreaterThan(0)
    })
  })

  it('has keys array for all shortcuts', () => {
    KEYBOARD_SHORTCUTS.forEach(shortcut => {
      expect(Array.isArray(shortcut.keys)).toBe(true)
      expect(shortcut.keys.length).toBeGreaterThan(0)
    })
  })

  describe('shortcut definitions', () => {
    it('Cmd/Ctrl+N is for new project', () => {
      const shortcut = KEYBOARD_SHORTCUTS.find(s => s.keys.join('+') === 'Cmd/Ctrl+N')
      expect(shortcut?.description).toBe('New project')
    })

    it('Cmd/Ctrl+S is for checkpoint', () => {
      const shortcut = KEYBOARD_SHORTCUTS.find(s => s.keys.join('+') === 'Cmd/Ctrl+S')
      expect(shortcut?.description).toBe('Create checkpoint')
    })

    it('Cmd/Ctrl+, is for settings', () => {
      const shortcut = KEYBOARD_SHORTCUTS.find(s => s.keys.join('+') === 'Cmd/Ctrl+,')
      expect(shortcut?.description).toBe('Open settings')
    })

    it('Cmd/Ctrl+K is for command palette', () => {
      const shortcut = KEYBOARD_SHORTCUTS.find(s => s.keys.join('+') === 'Cmd/Ctrl+K')
      expect(shortcut?.description).toBe('Command palette')
    })

    it('? is for showing shortcuts', () => {
      const shortcut = KEYBOARD_SHORTCUTS.find(s => s.keys.join('+') === '?')
      expect(shortcut?.description).toBe('Show keyboard shortcuts')
    })

    it('Esc is for closing modal', () => {
      const shortcut = KEYBOARD_SHORTCUTS.find(s => s.keys.join('+') === 'Esc')
      expect(shortcut?.description).toBe('Close modal')
    })
  })
})
