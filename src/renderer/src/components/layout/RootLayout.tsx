import type { ReactElement } from 'react';
import { Outlet } from 'react-router';
import { useEffect } from 'react';
import { uiBackendBridge } from '@renderer/bridges/UIBackendBridge';
import { useGlobalShortcuts } from '@renderer/hooks/useKeyboardShortcuts';

/**
 * Root layout component that wraps all pages.
 * Initializes the UIBackendBridge on mount and global keyboard shortcuts.
 */
export function RootLayout(): ReactElement {
  // Initialize global keyboard shortcuts (requires router context)
  useGlobalShortcuts();

  useEffect(() => {
    // Initialize bridge when app loads
    uiBackendBridge.initialize().catch(console.error);

    return () => {
      uiBackendBridge.cleanup();
    };
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Outlet />
    </div>
  );
}
