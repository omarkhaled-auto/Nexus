import type { ReactElement, ReactNode } from 'react';

interface InterviewLayoutProps {
  chatPanel: ReactNode;
  sidebarPanel: ReactNode;
}

/**
 * InterviewLayout - Split-screen container for the Genesis interview.
 *
 * Layout: 60% chat panel (left) | 40% sidebar panel (right)
 * Responsive: Stacks vertically on mobile (<768px) with chat on top.
 * Follows Cursor-style aesthetic with dark gradients.
 */
export function InterviewLayout({ chatPanel, sidebarPanel }: InterviewLayoutProps): ReactElement {
  return (
    <div className="h-screen flex flex-col md:flex-row bg-gradient-to-b from-background to-background/80">
      {/* Chat Panel - Left side (60% on desktop, full width on mobile) */}
      <div className="flex-1 md:w-3/5 min-h-0 flex flex-col">
        {chatPanel}
      </div>

      {/* Divider - Subtle border between panels */}
      <div className="hidden md:block border-r border-border" />

      {/* Sidebar Panel - Right side (40% on desktop, full width on mobile) */}
      <div className="h-1/3 md:h-auto md:w-2/5 border-t md:border-t-0 border-border min-h-0 flex flex-col">
        {sidebarPanel}
      </div>
    </div>
  );
}
