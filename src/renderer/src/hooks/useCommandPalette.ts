/**
 * useCommandPalette Hook
 *
 * Handles keyboard shortcuts for opening/closing the command palette.
 * Supports both Cmd+K (Mac) and Ctrl+K (Windows).
 */

import { useState, useEffect, useCallback } from 'react'

export interface UseCommandPaletteOptions {
  /** Whether the palette is initially open */
  initialOpen?: boolean
}

export interface UseCommandPaletteReturn {
  /** Whether the palette is open */
  isOpen: boolean
  /** Open the palette */
  open: () => void
  /** Close the palette */
  close: () => void
  /** Toggle the palette */
  toggle: () => void
}

export function useCommandPalette(
  options: UseCommandPaletteOptions = {}
): UseCommandPaletteReturn {
  const { initialOpen = false } = options
  const [isOpen, setIsOpen] = useState(initialOpen)

  const open = useCallback(() => { setIsOpen(true); }, [])
  const close = useCallback(() => { setIsOpen(false); }, [])
  const toggle = useCallback(() => { setIsOpen((prev) => !prev); }, [])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K (Mac) or Ctrl+K (Windows)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        toggle()
      }

      // Escape to close
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault()
        close()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => { document.removeEventListener('keydown', handleKeyDown); }
  }, [isOpen, toggle, close])

  return {
    isOpen,
    open,
    close,
    toggle
  }
}

export default useCommandPalette
