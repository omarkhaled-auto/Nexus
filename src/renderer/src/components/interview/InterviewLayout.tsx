import type { ReactElement, ReactNode } from 'react'
import { cn } from '@renderer/lib/utils'

export interface InterviewLayoutProps {
  children?: ReactNode
  chatPanel?: ReactNode
  sidebarPanel?: ReactNode
  className?: string
}

/**
 * InterviewLayout - Split-screen layout for the interview interface.
 * Provides responsive two-column layout with chat on left, sidebar on right.
 * Supports both children pattern and named panels pattern.
 */
export function InterviewLayout({ children, chatPanel, sidebarPanel, className }: InterviewLayoutProps): ReactElement {
  return (
    <div className={cn('flex h-full w-full gap-4 p-4', className)}>
      {children ? (
        children
      ) : (
        <>
          <div className="flex-1 min-w-0">{chatPanel}</div>
          <div className="w-80 flex-shrink-0">{sidebarPanel}</div>
        </>
      )}
    </div>
  )
}
