import type { ReactElement } from 'react';
import { Outlet, useLocation } from 'react-router';
import { useEffect, useState, useCallback } from 'react';
import { uiBackendBridge } from '@renderer/bridges/UIBackendBridge';
import { useGlobalShortcuts } from '@renderer/hooks/useKeyboardShortcuts';
import {
  Sidebar,
  SidebarNav,
  SidebarSection,
  defaultNavigationItems,
  settingsNavigationItems,
  SIDEBAR_WIDTH_EXPANDED,
  SIDEBAR_WIDTH_COLLAPSED,
} from './Sidebar';

// ============================================================================
// Constants
// ============================================================================

const SIDEBAR_STATE_KEY = 'nexus-sidebar-collapsed';

// Pages that should show the full sidebar navigation
const PAGES_WITH_SIDEBAR = [
  '/dashboard',
  '/genesis',
  '/evolution',
  '/agents',
  '/execution',
  '/settings',
];

// Pages that should be full-screen without sidebar (landing pages, etc.)
const FULL_SCREEN_PAGES = ['/'];

/**
 * Root layout component that wraps all pages.
 * Initializes the UIBackendBridge on mount and global keyboard shortcuts.
 * Provides the app shell with optional sidebar navigation.
 */
export function RootLayout(): ReactElement {
  const location = useLocation();

  // Initialize global keyboard shortcuts (requires router context)
  useGlobalShortcuts();

  // Sidebar collapsed state with localStorage persistence
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem(SIDEBAR_STATE_KEY);
      return saved === 'true';
    } catch {
      return false;
    }
  });

  // Persist sidebar state
  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_STATE_KEY, String(sidebarCollapsed));
    } catch {
      // Ignore localStorage errors
    }
  }, [sidebarCollapsed]);

  const handleSidebarToggle = useCallback(() => {
    setSidebarCollapsed((prev) => !prev);
  }, []);

  // Initialize UIBackendBridge
  useEffect(() => {
    uiBackendBridge.initialize();
    return () => {
      uiBackendBridge.cleanup();
    };
  }, []);

  // Determine if current page should show sidebar
  const showSidebar =
    PAGES_WITH_SIDEBAR.some((path) => location.pathname.startsWith(path)) &&
    !FULL_SCREEN_PAGES.includes(location.pathname);

  // Full-screen layout (landing page, etc.)
  if (!showSidebar) {
    return (
      <div
        className="min-h-screen bg-bg-dark text-text-primary"
        data-testid="root-layout"
      >
        <Outlet />
      </div>
    );
  }

  // App shell layout with sidebar
  return (
    <div
      className="flex min-h-screen bg-bg-dark text-text-primary"
      data-testid="root-layout"
    >
      {/* Sidebar Navigation */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={handleSidebarToggle}
        data-testid="app-sidebar"
      >
        {/* Main navigation */}
        <SidebarSection>
          <SidebarNav items={defaultNavigationItems} collapsed={sidebarCollapsed} />
        </SidebarSection>

        {/* Settings navigation (at bottom) */}
        <SidebarSection className="mt-auto pt-4 border-t border-border-default">
          <SidebarNav items={settingsNavigationItems} collapsed={sidebarCollapsed} />
        </SidebarSection>
      </Sidebar>

      {/* Main content area */}
      <div
        className="flex flex-col flex-1 min-w-0"
        style={{
          width: `calc(100% - ${sidebarCollapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED}px)`,
        }}
        data-testid="main-content-area"
      >
        <Outlet />
      </div>
    </div>
  );
}
