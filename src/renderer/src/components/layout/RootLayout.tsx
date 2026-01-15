import type { ReactElement } from 'react';
import { Outlet } from 'react-router';
import { useEffect } from 'react';
import { uiBackendBridge } from '@renderer/bridges/UIBackendBridge';

/**
 * Root layout component that wraps all pages.
 * Initializes the UIBackendBridge on mount.
 */
export function RootLayout(): ReactElement {
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
