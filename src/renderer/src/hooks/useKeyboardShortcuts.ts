import { useHotkeys } from 'react-hotkeys-hook'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { useUIStore } from '../stores/uiStore'
import { useProjectStore } from '../stores/projectStore'

/**
 * Check if running in Electron environment with nexusAPI available
 */
function isElectronEnvironment(): boolean {
  return typeof window !== 'undefined' && typeof window.nexusAPI !== 'undefined'
}

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

      // Get current project ID from store
      const projectId = useProjectStore.getState().currentProject?.id

      if (!isElectronEnvironment()) {
        toast.info('Checkpoint creation requires Electron environment')
        return
      }

      if (!projectId) {
        toast.info('No active project - open a project first')
        return
      }

      // Create checkpoint via backend IPC
      void (async () => {
        const loadingToast = toast.loading('Creating checkpoint...')
        try {
          const checkpoint = await window.nexusAPI.checkpointCreate(
            projectId,
            'Manual checkpoint via keyboard shortcut'
          )
          toast.dismiss(loadingToast)
          if (checkpoint) {
            toast.success('Checkpoint created successfully')
          } else {
            toast.error('Failed to create checkpoint')
          }
        } catch (err) {
          toast.dismiss(loadingToast)
          console.error('Failed to create checkpoint:', err)
          toast.error(err instanceof Error ? err.message : 'Failed to create checkpoint')
        }
      })()
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
