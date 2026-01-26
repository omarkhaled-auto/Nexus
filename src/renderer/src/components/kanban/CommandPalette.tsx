/**
 * CommandPalette - Keyboard-triggered command palette for Kanban
 *
 * Features:
 * - Triggered by Cmd+K (Mac) / Ctrl+K (Windows)
 * - Fuzzy search features by title/description
 * - Quick actions
 * - Keyboard navigation
 */

import {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  type ReactElement
} from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@renderer/lib/utils'
import { useCommandPalette } from '@renderer/hooks/useCommandPalette'
import type { Feature, FeaturePriority } from '@renderer/types/feature'
import { Search, FileText, Command } from 'lucide-react'

// ============================================================================
// Types
// ============================================================================

export interface CommandPaletteProps {
  /** Features to search */
  features: Feature[]
  /** Callback when a feature is selected */
  onSelectFeature: (featureId: string) => void
}

interface SearchResult {
  id: string
  title: string
  description: string
  priority: FeaturePriority
  type: 'feature'
}

// ============================================================================
// Constants
// ============================================================================

const PRIORITY_COLORS: Record<FeaturePriority, string> = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-green-500'
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Simple fuzzy search scoring
 * Returns a score (higher is better match) or -1 for no match
 */
function fuzzyScore(query: string, text: string): number {
  const lowerQuery = query.toLowerCase()
  const lowerText = text.toLowerCase()

  // Exact match
  if (lowerText === lowerQuery) return 100

  // Starts with query
  if (lowerText.startsWith(lowerQuery)) return 90

  // Contains query as substring
  if (lowerText.includes(lowerQuery)) return 80

  // Fuzzy character matching
  let queryIndex = 0
  let score = 0
  let consecutiveBonus = 0

  for (let i = 0; i < lowerText.length && queryIndex < lowerQuery.length; i++) {
    if (lowerText[i] === lowerQuery[queryIndex]) {
      score += 10 + consecutiveBonus
      consecutiveBonus += 5 // Bonus for consecutive matches
      queryIndex++
    } else {
      consecutiveBonus = 0
    }
  }

  // All query characters must be found
  if (queryIndex < lowerQuery.length) return -1

  return score
}

// ============================================================================
// Main Component
// ============================================================================

export function CommandPalette({
  features,
  onSelectFeature
}: CommandPaletteProps): ReactElement | null {
  const { isOpen, close } = useCommandPalette()
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Filter and sort results based on query
  const results = useMemo<SearchResult[]>(() => {
    if (!query.trim()) {
      // Show all features (limited) when no query
      return features.slice(0, 10).map((f) => ({
        id: f.id,
        title: f.title,
        description: f.description,
        priority: f.priority,
        type: 'feature' as const
      }))
    }

    // Score and filter features
    const scored = features
      .map((f) => {
        const titleScore = fuzzyScore(query, f.title)
        const descScore = fuzzyScore(query, f.description) * 0.5 // Description matches are worth less
        const maxScore = Math.max(titleScore, descScore)
        return { feature: f, score: maxScore }
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)

    return scored.map(({ feature: f }) => ({
      id: f.id,
      title: f.title,
      description: f.description,
      priority: f.priority,
      type: 'feature' as const
    }))
  }, [features, query])

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelectedIndex(0)
      // Focus input after a brief delay
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0)
  }, [results])

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return
    const selectedElement = listRef.current.children[selectedIndex] as HTMLElement | undefined
    if (selectedElement) {
      selectedElement.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedIndex])

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1))
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex((prev) => Math.max(prev - 1, 0))
          break
        case 'Enter':
          e.preventDefault()
          if (results[selectedIndex]) {
            onSelectFeature(results[selectedIndex].id)
            close()
          }
          break
        case 'Escape':
          e.preventDefault()
          close()
          break
      }
    },
    [results, selectedIndex, onSelectFeature, close]
  )

  // Handle result click
  const handleResultClick = useCallback(
    (result: SearchResult) => {
      onSelectFeature(result.id)
      close()
    },
    [onSelectFeature, close]
  )

  if (!isOpen) return null

  const paletteContent = (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm animate-in fade-in-0 duration-100"
        onClick={close}
      />

      {/* Palette */}
      <div className="fixed inset-x-0 top-[20%] z-50 mx-auto max-w-xl px-4 animate-in slide-in-from-top-4 fade-in-0 duration-150">
        <div className="bg-popover border border-border rounded-xl shadow-2xl overflow-hidden">
          {/* Search input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
            <Search className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); }}
              onKeyDown={handleKeyDown}
              placeholder="Search features..."
              className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none text-sm"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
            />
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono">esc</kbd>
              <span>to close</span>
            </div>
          </div>

          {/* Results */}
          <div ref={listRef} className="max-h-[300px] overflow-y-auto p-2">
            {results.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No features found
              </div>
            ) : (
              results.map((result, index) => (
                <button
                  key={result.id}
                  type="button"
                  onClick={() => { handleResultClick(result); }}
                  onMouseEnter={() => { setSelectedIndex(index); }}
                  className={cn(
                    'w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left transition-colors',
                    index === selectedIndex ? 'bg-muted' : 'hover:bg-muted/50'
                  )}
                >
                  {/* Icon */}
                  <div className="mt-0.5 p-1.5 rounded-md bg-background border border-border">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground truncate">
                        {result.title}
                      </span>
                      <div
                        className={cn(
                          'w-2 h-2 rounded-full flex-shrink-0',
                          PRIORITY_COLORS[result.priority]
                        )}
                      />
                    </div>
                    {result.description && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {result.description}
                      </p>
                    )}
                  </div>

                  {/* Shortcut hint */}
                  {index === selectedIndex && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground self-center">
                      <kbd className="px-1 py-0.5 rounded bg-background border border-border font-mono">
                        Enter
                      </kbd>
                    </div>
                  )}
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-border bg-muted/30 flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded bg-background border border-border font-mono">
                  <span className="font-sans">↑</span>
                </kbd>
                <kbd className="px-1 py-0.5 rounded bg-background border border-border font-mono">
                  <span className="font-sans">↓</span>
                </kbd>
                navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded bg-background border border-border font-mono">
                  Enter
                </kbd>
                select
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Command className="h-3 w-3" />
              <span>K to toggle</span>
            </div>
          </div>
        </div>
      </div>
    </>
  )

  return createPortal(paletteContent, document.body)
}

export default CommandPalette
