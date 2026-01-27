import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { useUIStore } from '../stores/uiStore'
import { KEYBOARD_SHORTCUTS } from '../hooks/useKeyboardShortcuts'
import { cn } from '@renderer/lib/utils'
import { Keyboard } from 'lucide-react'

/**
 * Modal displaying all available keyboard shortcuts.
 *
 * Opens when user presses '?' key.
 * Closes on 'Esc' key or clicking outside.
 *
 * Features glassmorphism design with enhanced table styling,
 * keyboard key styling with subtle shadows, and hover states.
 */
export function KeyboardShortcutsModal() {
  const showShortcuts = useUIStore((s) => s.showShortcuts)
  const setShowShortcuts = useUIStore((s) => s.setShowShortcuts)

  return (
    <Dialog open={showShortcuts} onOpenChange={setShowShortcuts}>
      <DialogContent className={cn(
        "max-w-md p-0 overflow-hidden",
        "bg-[#161B22]/95 backdrop-blur-xl",
        "border border-[#30363D]",
        "shadow-[0_24px_48px_rgba(0,0,0,0.5),0_0_30px_rgba(124,58,237,0.1)]",
        "rounded-2xl"
      )}>
        {/* Header with gradient accent */}
        <DialogHeader className="relative px-6 pt-6 pb-4 border-b border-[#30363D]/50">
          {/* Gradient line accent */}
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#7C3AED]/30 to-transparent" />

          <div className="flex items-center gap-3">
            <div className="relative p-2 rounded-lg bg-[#7C3AED]/10 border border-[#7C3AED]/20">
              <Keyboard className="h-5 w-5 text-[#7C3AED]" />
              <div className="absolute inset-0 blur-md bg-[#7C3AED]/20 rounded-lg" />
            </div>
            <DialogTitle className="text-lg font-semibold text-[#F0F6FC]">
              Keyboard Shortcuts
            </DialogTitle>
          </div>
        </DialogHeader>

        {/* Shortcuts list */}
        <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
          <div className="space-y-1">
            {KEYBOARD_SHORTCUTS.map((shortcut, i) => (
              <div
                key={i}
                className={cn(
                  "flex justify-between items-center py-3 px-3 -mx-3",
                  "rounded-lg transition-colors duration-150",
                  "hover:bg-[#21262D]/50",
                  i !== KEYBOARD_SHORTCUTS.length - 1 && "border-b border-[#30363D]/30"
                )}
              >
                <span className="text-sm text-[#8B949E]">{shortcut.description}</span>
                <div className="flex gap-1.5">
                  {shortcut.keys.map((key, j) => (
                    <kbd
                      key={j}
                      className={cn(
                        "px-2.5 py-1 min-w-[28px] text-center",
                        "text-xs font-mono font-medium",
                        "bg-[#0D1117] text-[#F0F6FC]",
                        "rounded-md",
                        "border border-[#30363D]",
                        "shadow-[0_2px_0_0_#21262D,inset_0_1px_0_0_rgba(255,255,255,0.05)]"
                      )}
                    >
                      {key}
                    </kbd>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer hint */}
        <div className="px-6 py-3 border-t border-[#30363D]/50 bg-[#0D1117]/50">
          <p className="text-xs text-[#8B949E] text-center">
            Press <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-[#21262D] rounded border border-[#30363D]">Esc</kbd> to close
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
