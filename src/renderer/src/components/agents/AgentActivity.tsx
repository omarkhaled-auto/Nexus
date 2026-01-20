/**
 * AgentActivity Component
 *
 * Displays real-time terminal-like output from an AI agent.
 * Features auto-scrolling, pause/resume, and color-coded output.
 *
 * @example
 * // Basic usage
 * <AgentActivity agentId="agent-1" output={outputLines} status="working" />
 *
 * @example
 * // With clear callback and timestamp
 * <AgentActivity
 *   agentId="agent-1"
 *   output={outputLines}
 *   status="working"
 *   showTimestamp
 *   onClear={() => clearOutput('agent-1')}
 * />
 */

import React, { useRef, useEffect, useState, useCallback } from 'react'
import { Trash2, Pause, Play, ChevronDown } from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import { type AgentStatus, colors } from '@renderer/styles/tokens'
import { Button } from '../ui/button'
import { ScrollArea } from '../ui/scroll-area'

// =============================================================================
// TYPES
// =============================================================================

export interface AgentActivityProps {
  /** Agent ID */
  agentId: string
  /** Output lines to display */
  output: string[]
  /** Current agent status */
  status: AgentStatus
  /** Enable auto-scroll to bottom on new output */
  autoScroll?: boolean
  /** Max height (CSS value) */
  maxHeight?: number | string
  /** Show timestamp prefix on lines */
  showTimestamp?: boolean
  /** Callback when clear button is clicked */
  onClear?: () => void
  /** Additional className */
  className?: string
  /** Test ID for Playwright */
  'data-testid'?: string
}

// =============================================================================
// HELPERS
// =============================================================================

/** Parse ANSI escape codes and convert to styled spans */
function parseAnsiLine(line: string): React.ReactNode {
  // Simple ANSI color code patterns
  const patterns: Array<{ regex: RegExp; className: string }> = [
    { regex: /\[32m(.*?)\[0m|\[32m(.*?)$/g, className: 'text-accent-success' }, // Green
    { regex: /\[31m(.*?)\[0m|\[31m(.*?)$/g, className: 'text-accent-error' }, // Red
    { regex: /\[33m(.*?)\[0m|\[33m(.*?)$/g, className: 'text-accent-warning' }, // Yellow
    { regex: /\[34m(.*?)\[0m|\[34m(.*?)$/g, className: 'text-accent-info' }, // Blue
    { regex: /\[36m(.*?)\[0m|\[36m(.*?)$/g, className: 'text-accent-secondary' }, // Cyan
    { regex: /\[35m(.*?)\[0m|\[35m(.*?)$/g, className: 'text-accent-primary' }, // Magenta/Purple
    { regex: /\[90m(.*?)\[0m|\[90m(.*?)$/g, className: 'text-text-tertiary' }, // Gray
    { regex: /\[1m(.*?)\[0m|\[1m(.*?)$/g, className: 'font-bold' }, // Bold
  ]

  // Strip escape sequences for simple display if complex parsing fails
  const cleanLine = line.replace(/\[\d+m/g, '')

  // Detect line type based on content
  if (
    line.includes('error') ||
    line.includes('Error') ||
    line.includes('ERROR') ||
    line.includes('failed') ||
    line.includes('Failed')
  ) {
    return <span className="text-accent-error">{cleanLine}</span>
  }
  if (
    line.includes('success') ||
    line.includes('Success') ||
    line.includes('passed') ||
    line.includes('Passed') ||
    line.includes('✓') ||
    line.includes('✔')
  ) {
    return <span className="text-accent-success">{cleanLine}</span>
  }
  if (line.includes('warning') || line.includes('Warning') || line.includes('WARN')) {
    return <span className="text-accent-warning">{cleanLine}</span>
  }
  if (line.startsWith('>') || line.startsWith('$') || line.startsWith('#')) {
    return <span className="text-accent-secondary">{cleanLine}</span>
  }
  if (line.startsWith('//') || line.startsWith('/*') || line.startsWith('*')) {
    return <span className="text-text-tertiary">{cleanLine}</span>
  }

  return cleanLine
}

/** Format current time for timestamp */
function formatTimestamp(): string {
  const now = new Date()
  return now.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

// =============================================================================
// COMPONENT
// =============================================================================

export const AgentActivity = React.forwardRef<HTMLDivElement, AgentActivityProps>(
  (
    {
      agentId,
      output,
      status,
      autoScroll = true,
      maxHeight = 400,
      showTimestamp = false,
      onClear,
      className,
      'data-testid': testId,
    },
    ref
  ) => {
    const scrollRef = useRef<HTMLDivElement>(null)
    const [isPaused, setIsPaused] = useState(false)
    const [isAtBottom, setIsAtBottom] = useState(true)
    const prevOutputLength = useRef(output.length)

    // Auto-scroll to bottom when new output arrives
    useEffect(() => {
      if (autoScroll && !isPaused && isAtBottom && output.length > prevOutputLength.current) {
        scrollRef.current?.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: 'smooth',
        })
      }
      prevOutputLength.current = output.length
    }, [output, autoScroll, isPaused, isAtBottom])

    // Track scroll position to determine if at bottom
    const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
      const target = e.currentTarget
      const threshold = 50 // pixels from bottom
      const atBottom = target.scrollHeight - target.scrollTop - target.clientHeight < threshold
      setIsAtBottom(atBottom)
    }, [])

    // Scroll to bottom manually
    const scrollToBottom = useCallback(() => {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      })
      setIsPaused(false)
    }, [])

    const isEmpty = output.length === 0

    return (
      <div
        ref={ref}
        data-testid={testId ?? `agent-activity-${agentId}`}
        data-agent-id={agentId}
        className={cn(
          'flex flex-col rounded-lg border border-border-default bg-bg-dark overflow-hidden',
          className
        )}
      >
        {/* Header toolbar */}
        <div className="flex items-center justify-between px-3 py-2 bg-bg-card border-b border-border-default">
          <div className="flex items-center gap-2">
            {/* Terminal indicator */}
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-accent-error" />
              <div className="w-3 h-3 rounded-full bg-accent-warning" />
              <div className="w-3 h-3 rounded-full bg-accent-success" />
            </div>
            <span className="text-xs text-text-secondary font-mono ml-2">
              Agent Output
              {status === 'working' && (
                <span className="inline-flex ml-2">
                  <span className="animate-pulse">●</span>
                  <span className="ml-1 text-accent-success">Live</span>
                </span>
              )}
            </span>
          </div>

          <div className="flex items-center gap-1">
            {/* Pause/Resume button */}
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => { setIsPaused(!isPaused); }}
              disabled={isEmpty}
              title={isPaused ? 'Resume auto-scroll' : 'Pause auto-scroll'}
            >
              {isPaused ? <Play size={14} /> : <Pause size={14} />}
            </Button>

            {/* Clear button */}
            {onClear && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onClear}
                disabled={isEmpty}
                title="Clear output"
              >
                <Trash2 size={14} />
              </Button>
            )}
          </div>
        </div>

        {/* Output area */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto font-mono text-sm"
          style={{
            maxHeight: typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight,
            minHeight: 100,
          }}
        >
          {isEmpty ? (
            <div className="flex items-center justify-center h-full min-h-[100px] text-text-tertiary text-sm">
              {status === 'idle' && 'Agent is idle. Output will appear here when working.'}
              {status === 'working' && 'Waiting for output...'}
              {status === 'success' && 'Task completed. No output to display.'}
              {status === 'error' && 'Agent encountered an error.'}
              {status === 'pending' && 'Agent is pending. Waiting to start.'}
            </div>
          ) : (
            <div className="p-3 space-y-0.5">
              {output.map((line, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 text-text-primary leading-relaxed"
                  data-testid={`output-line-${index}`}
                >
                  {/* Line number */}
                  <span className="flex-shrink-0 w-8 text-right text-text-tertiary select-none">
                    {index + 1}
                  </span>

                  {/* Timestamp (optional) */}
                  {showTimestamp && (
                    <span className="flex-shrink-0 text-text-tertiary select-none">
                      [{formatTimestamp()}]
                    </span>
                  )}

                  {/* Line content */}
                  <span className="flex-1 whitespace-pre-wrap break-all">{parseAnsiLine(line)}</span>
                </div>
              ))}

              {/* Cursor indicator when working */}
              {status === 'working' && (
                <div className="flex items-start gap-2">
                  <span className="w-8" />
                  <span className="animate-blink text-accent-primary">▋</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Scroll to bottom button (shown when not at bottom) */}
        {!isAtBottom && !isEmpty && (
          <button
            onClick={scrollToBottom}
            className={cn(
              'absolute bottom-12 right-4 p-2 rounded-full',
              'bg-bg-card border border-border-default',
              'text-text-secondary hover:text-text-primary',
              'shadow-md hover:shadow-lg',
              'transition-all duration-fast',
              'focus:outline-none focus:ring-2 focus:ring-accent-primary'
            )}
            title="Scroll to bottom"
          >
            <ChevronDown size={16} />
          </button>
        )}
      </div>
    )
  }
)

AgentActivity.displayName = 'AgentActivity'

export default AgentActivity
