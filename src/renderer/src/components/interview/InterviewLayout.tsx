import { useState, useRef, useCallback, type ReactElement, type ReactNode, type MouseEvent } from 'react';
import { cn } from '@renderer/lib/utils';

export interface InterviewLayoutProps {
  children?: ReactNode;
  chatPanel?: ReactNode;
  sidebarPanel?: ReactNode;
  className?: string;
  /** Default split ratio (0-1), defaults to 0.6 (60/40 split) */
  defaultSplitRatio?: number;
  /** Minimum width for chat panel in pixels */
  minChatWidth?: number;
  /** Minimum width for sidebar panel in pixels */
  minSidebarWidth?: number;
}

/**
 * InterviewLayout - Resizable split-screen layout for the interview interface.
 *
 * Features:
 * - Draggable divider for resizing panels
 * - Minimum width constraints for both panels
 * - Persists split ratio preference
 * - Smooth resize with visual feedback
 */
export function InterviewLayout({
  children,
  chatPanel,
  sidebarPanel,
  className,
  defaultSplitRatio = 0.6,
  minChatWidth = 400,
  minSidebarWidth = 300,
}: InterviewLayoutProps): ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const [splitRatio, setSplitRatio] = useState(() => {
    // Try to restore from localStorage
    const saved = localStorage.getItem('nexus-interview-split-ratio');
    return saved ? parseFloat(saved) : defaultSplitRatio;
  });
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = useCallback((e: MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback(
    (e: globalThis.MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const containerWidth = containerRect.width;
      const mouseX = e.clientX - containerRect.left;

      // Calculate new ratio
      let newRatio = mouseX / containerWidth;

      // Enforce minimum widths
      const minChatRatio = minChatWidth / containerWidth;
      const maxChatRatio = 1 - minSidebarWidth / containerWidth;

      newRatio = Math.max(minChatRatio, Math.min(maxChatRatio, newRatio));

      setSplitRatio(newRatio);
    },
    [isDragging, minChatWidth, minSidebarWidth]
  );

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      // Save preference
      localStorage.setItem('nexus-interview-split-ratio', splitRatio.toString());
    }
  }, [isDragging, splitRatio]);

  // Attach global mouse events for dragging
  if (typeof window !== 'undefined') {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'flex h-full w-full',
        isDragging && 'select-none cursor-col-resize',
        className
      )}
      data-testid="interview-layout"
    >
      {children ? (
        children
      ) : (
        <>
          {/* Chat Panel */}
          <div
            className="flex-shrink-0 min-w-0 h-full"
            style={{ width: `calc(${splitRatio * 100}% - 4px)` }}
            data-testid="chat-panel-container"
          >
            {chatPanel}
          </div>

          {/* Resizable Divider */}
          <div
            className={cn(
              'relative flex-shrink-0 w-2 h-full cursor-col-resize group',
              'hover:bg-accent-primary/20',
              isDragging && 'bg-accent-primary/30'
            )}
            onMouseDown={handleMouseDown}
            data-testid="resize-handle"
          >
            {/* Visual divider line */}
            <div
              className={cn(
                'absolute left-1/2 top-0 h-full w-px -translate-x-1/2',
                'bg-border-default transition-colors duration-150',
                'group-hover:bg-accent-primary',
                isDragging && 'bg-accent-primary'
              )}
            />
            {/* Drag handle indicator */}
            <div
              className={cn(
                'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
                'w-1 h-8 rounded-full',
                'bg-border-default transition-colors duration-150',
                'opacity-0 group-hover:opacity-100',
                isDragging && 'opacity-100 bg-accent-primary'
              )}
            />
          </div>

          {/* Sidebar Panel */}
          <div
            className="flex-1 min-w-0 h-full"
            style={{ width: `calc(${(1 - splitRatio) * 100}% - 4px)` }}
            data-testid="sidebar-panel-container"
          >
            {sidebarPanel}
          </div>
        </>
      )}
    </div>
  );
}
