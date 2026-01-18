import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { useUIStore } from '../stores/uiStore'
import { KEYBOARD_SHORTCUTS } from '../hooks/useKeyboardShortcuts'

/**
 * Modal displaying all available keyboard shortcuts.
 *
 * Opens when user presses '?' key.
 * Closes on 'Esc' key or clicking outside.
 */
export function KeyboardShortcutsModal() {
  const showShortcuts = useUIStore((s) => s.showShortcuts)
  const setShowShortcuts = useUIStore((s) => s.setShowShortcuts)

  return (
    <Dialog open={showShortcuts} onOpenChange={setShowShortcuts}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          {KEYBOARD_SHORTCUTS.map((shortcut, i) => (
            <div
              key={i}
              className="flex justify-between items-center py-2 border-b border-border last:border-0"
            >
              <span className="text-muted-foreground">{shortcut.description}</span>
              <div className="flex gap-1">
                {shortcut.keys.map((key, j) => (
                  <kbd
                    key={j}
                    className="px-2 py-1 text-xs font-mono bg-muted rounded border border-border"
                  >
                    {key}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
