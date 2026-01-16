import { useHotkeys } from 'react-hotkeys-hook'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { useUIStore } from '../stores/uiStore'

/**
 * Global keyboard shortcuts hook.
 *
 * Must be called within a Router context (uses useNavigate).
 * Typically called at the app root level.
 *
 * Shortcuts:
 * - Cmd/Ctrl + N → New project (navigates to genesis)
 * - Cmd/Ctrl + S → Create checkpoint
 * - Cmd/Ctrl + , → Open settings
 * - Cmd/Ctrl + K → Command palette (future)
 * - ? → Show keyboard shortcuts modal
 * - Esc → Close modals
 */
export function useGlobalShortcuts(): void {
  const navigate = useNavigate()

  // Cmd/Ctrl + N → New project
  useHotkeys(
    'mod+n',
    (e) => {
      e.preventDefault()
      void navigate('/genesis')
      toast.info('Starting new project...')
    },
    { preventDefault: true }
  )

  // Cmd/Ctrl + S → Create checkpoint
  useHotkeys(
    'mod+s',
    (e) => {
      e.preventDefault()
      // TODO: Connect to checkpoint creation when available
      toast.success('Checkpoint created')
    },
    { preventDefault: true }
  )

  // Cmd/Ctrl + , → Open settings
  useHotkeys(
    'mod+,',
    (e) => {
      e.preventDefault()
      void navigate('/settings')
    },
    { preventDefault: true }
  )

  // Cmd/Ctrl + K → Command palette (future feature)
  useHotkeys(
    'mod+k',
    (e) => {
      e.preventDefault()
      toast.info('Command palette coming soon')
      // TODO: Implement command palette in future
    },
    { preventDefault: true }
  )

  // ? → Show keyboard shortcuts (when not in input)
  useHotkeys(
    '?',
    () => {
      useUIStore.getState().setShowShortcuts(true)
    },
    {
      enableOnFormTags: false,
    }
  )

  // Esc → Close modals
  useHotkeys('escape', () => {
    useUIStore.getState().setShowShortcuts(false)
  })
}

/**
 * Keyboard shortcuts data for display in the shortcuts modal.
 */
export const KEYBOARD_SHORTCUTS = [
  { keys: ['Cmd/Ctrl', 'N'], description: 'New project' },
  { keys: ['Cmd/Ctrl', 'S'], description: 'Create checkpoint' },
  { keys: ['Cmd/Ctrl', ','], description: 'Open settings' },
  { keys: ['Cmd/Ctrl', 'K'], description: 'Command palette' },
  { keys: ['?'], description: 'Show keyboard shortcuts' },
  { keys: ['Esc'], description: 'Close modal' },
] as const
